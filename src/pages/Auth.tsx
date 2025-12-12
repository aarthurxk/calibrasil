import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';
import caliLogo from '@/assets/cali-logo.jpeg';

const loginSchema = z.object({
  email: z.string().trim().email('E-mail inválido').max(255, 'E-mail muito longo'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = z.object({
  firstName: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  lastName: z.string().trim().min(1, 'Sobrenome é obrigatório').max(100, 'Sobrenome muito longo'),
  email: z.string().trim().email('E-mail inválido').max(255, 'E-mail muito longo'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  
  const { signIn, signUp, user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (role === 'admin' || role === 'manager') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, role, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({
      email: loginEmail,
      password: loginPassword,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('E-mail ou senha incorretos');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Confirme seu e-mail antes de fazer login');
      } else {
        toast.error('Erro ao fazer login. Tente novamente.');
      }
      return;
    }

    toast.success('Bem-vindo de volta! 🤙');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signupSchema.safeParse({
      firstName,
      lastName,
      email: signupEmail,
      password: signupPassword,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const fullName = `${firstName} ${lastName}`;
    const { error } = await signUp(signupEmail, signupPassword, fullName);
    setIsLoading(false);

    if (error) {
      console.error('Signup error details:', error.message, error);
      
      // Mensagens específicas do Supabase traduzidas
      const errorMessage = error.message.toLowerCase();
      
      if (error.message.includes('User already registered')) {
        toast.error('Este e-mail já está cadastrado. Tente fazer login.');
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        toast.error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      } else if (errorMessage.includes('invalid') && errorMessage.includes('email')) {
        toast.error('Formato de e-mail inválido.');
      } else if (errorMessage.includes('password should be at least')) {
        toast.error('A senha deve ter no mínimo 6 caracteres.');
      } else if (errorMessage.includes('password should contain')) {
        // Captura requisitos de complexidade de senha
        toast.error('A senha deve conter letras e números.');
      } else if (errorMessage.includes('password')) {
        // Exibe a mensagem original traduzida
        toast.error(`Erro na senha: ${error.message}`);
      } else if (errorMessage.includes('signup is disabled')) {
        toast.error('Cadastro temporariamente desabilitado.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        toast.error('Erro de conexão. Verifique sua internet.');
      } else {
        // Fallback: exibe o erro real do Supabase para debugging
        console.error('Erro não mapeado:', error.message);
        toast.error(`Erro ao criar conta: ${error.message}`);
      }
      return;
    }

    toast.success('Conta criada com sucesso! Bem-vindo à Cali! 🤙');
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="container py-12 flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-12">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar pro Início
        </Link>

        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <img
              src={caliLogo}
              alt="Cali"
              className="h-16 w-16 rounded-xl mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold">E aí, bem-vindo à Cali! 🤙</h1>
            <p className="text-muted-foreground">
              Entra na sua conta ou cria uma nova pra fazer parte da nossa tribo
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-ocean text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first-name">Nome</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="first-name"
                          placeholder="Seu nome"
                          className="pl-10"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="last-name">Sobrenome</Label>
                      <Input
                        id="last-name"
                        placeholder="Sobrenome"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="signup-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mínimo de 6 caracteres
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-ocean text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Criando conta...' : 'Criar Conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Auth;
