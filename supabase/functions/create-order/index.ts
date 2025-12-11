import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
