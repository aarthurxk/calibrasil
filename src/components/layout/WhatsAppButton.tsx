import { MessageCircle } from 'lucide-react';

const WhatsAppButton = () => {
  const phoneNumber = '5581994446464'; // (81) 99444-6464
  const message = encodeURIComponent('Olá! Vim pelo site da Cali e gostaria de saber mais.');
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 
                 bg-[#25D366] hover:bg-[#128C7E] text-white 
                 rounded-full p-3 sm:p-4 shadow-lg 
                 transition-all duration-300 hover:scale-110
                 flex items-center justify-center
                 animate-[bounce-subtle_2s_ease-in-out_infinite] hover:animate-none"
      aria-label="Fale conosco pelo WhatsApp"
    >
      <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 fill-current" />
    </a>
  );
};

export default WhatsAppButton;
