import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5; // Max 5 orders per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientIP);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  size?: string;
  color?: string;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  zip: string;
}

interface OrderRequest {
  items: CartItem[];
  email: string;
  phone?: string;
  shipping_address: ShippingAddress;
  user_id?: string;
  total: number;
  shipping: number;
  payment_method: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    if (!checkRateLimit(clientIP)) {
      console.log(`[CREATE-ORDER] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Muitas tentativas. Por favor, aguarde um minuto antes de tentar novamente.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: OrderRequest = await req.json();
    
    // Log order request without sensitive data
    console.log('Received order request:', {
      itemCount: body.items?.length,
      hasEmail: !!body.email,
      hasPhone: !!body.phone,
      hasShippingAddress: !!body.shipping_address,
      paymentMethod: body.payment_method
    });

    // Validate required fields
    if (!body.items || body.items.length === 0) {
      throw new Error('Carrinho vazio');
    }
    
    if (!body.email) {
      throw new Error('Email é obrigatório');
    }
    
    if (!body.shipping_address) {
      throw new Error('Endereço de entrega é obrigatório');
    }

    const { firstName, lastName, address, city, zip } = body.shipping_address;
    if (!firstName || !lastName || !address || !city || !zip) {
      throw new Error('Todos os campos do endereço são obrigatórios');
    }

    // SECURITY: Fetch real prices from database to prevent price manipulation
    const productIds = body.items.map(item => item.id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, price, name')
      .in('id', productIds);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw new Error('Erro ao validar produtos');
    }

    // Validate all products exist
    if (!products || products.length !== productIds.length) {
      console.error('Product count mismatch:', { 
        requested: productIds.length, 
        found: products?.length || 0 
      });
      throw new Error('Um ou mais produtos não foram encontrados');
    }

    // Calculate total using real prices from database
    const itemsTotal = body.items.reduce((sum, item) => {
      const realProduct = products.find(p => p.id === item.id);
      if (!realProduct) {
        throw new Error(`Produto não encontrado: ${item.id}`);
      }
      return sum + (realProduct.price * item.quantity);
    }, 0);
    
    const finalTotal = itemsTotal + (body.shipping || 0);

    console.log('Price validation:', {
      clientTotal: body.total,
      calculatedTotal: finalTotal,
      itemsTotal: itemsTotal,
      shipping: body.shipping || 0
    });

    // Create order with validated prices
    const orderData = {
      user_id: body.user_id || null,
      guest_email: body.user_id ? null : body.email,
      phone: body.phone || null,
      total: finalTotal,
      status: 'pending',
      payment_status: 'pending',
      payment_method: body.payment_method || 'pending',
      shipping_address: body.shipping_address,
    };

    console.log('Creating order with validated total:', finalTotal);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw new Error(`Erro ao criar pedido: ${orderError.message}`);
    }

    console.log('Order created:', order.id);

    // Create order items with validated prices from database
    const orderItems = body.items.map(item => {
      const realProduct = products.find(p => p.id === item.id)!;
      return {
        order_id: order.id,
        product_id: item.id,
        product_name: realProduct.name,
        price: realProduct.price, // Use price from database
        quantity: item.quantity,
      };
    });

    console.log('Creating order items:', orderItems.length);

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback order if items fail
      await supabase.from('orders').delete().eq('id', order.id);
      throw new Error(`Erro ao criar itens do pedido: ${itemsError.message}`);
    }

    console.log('Order completed successfully:', order.id);

    // Check for low stock after order and send alert if needed
    try {
      // Get all variants for ordered products with their current stock
      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select('*, products!inner(name)')
        .in('product_id', productIds);

      if (!variantsError && variants) {
        const lowStockItems = variants
          .filter(v => v.stock_quantity <= 5)
          .map(v => ({
            productName: (v.products as any).name,
            productId: v.product_id,
            color: v.color,
            model: v.model,
            currentStock: v.stock_quantity
          }));

        if (lowStockItems.length > 0) {
          console.log(`[CREATE-ORDER] Found ${lowStockItems.length} low stock items, sending alert`);
          
          // Call low stock email function
          const lowStockResponse = await fetch(
            `${supabaseUrl}/functions/v1/send-low-stock-email`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({ items: lowStockItems }),
            }
          );
          
          if (!lowStockResponse.ok) {
            console.error('[CREATE-ORDER] Failed to send low stock email');
          } else {
            console.log('[CREATE-ORDER] Low stock alert sent');
          }
        }
      }
    } catch (lowStockError) {
      console.error('[CREATE-ORDER] Error checking low stock:', lowStockError);
      // Don't fail the order for low stock check errors
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        order_id: order.id,
        message: 'Pedido criado com sucesso!' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('Error in create-order function:', error instanceof Error ? error.message : 'Unknown error');
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
