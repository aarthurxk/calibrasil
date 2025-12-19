import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react';
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
  password: z.string().min(1, 'Senha é obrigatória'),
});

const signupSchema = z.object({
  firstName: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  lastName: z.string().trim().min(1, 'Sobrenome é obrigatório').max(100, 'Sobrenome muito longo'),
  email: z.string().trim().email('E-mail inválido').max(255, 'E-mail muito longo'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve ter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve ter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve ter pelo menos um número')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Senha deve ter pelo menos um caractere especial'),
});

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve ter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve ter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve ter pelo menos um número')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Senha deve ter pelo menos um caractere especial'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

const passwordRequirements = [
  { 
    id: 'length', 
    label: 'Mínimo de 8 caracteres', 
    test: (password: string) => password.length >= 8 
  },
  { 
    id: 'uppercase', 
    label: 'Uma letra maiúscula', 
    test: (password: string) => /[A-Z]/.test(password) 
  },
  { 
    id: 'lowercase', 
    label: 'Uma letra minúscula', 
    test: (password: string) => /[a-z]/.test(password) 
  },
  { 
    id: 'number', 
    label: 'Um número', 
    test: (password: string) => /[0-9]/.test(password) 
  },
  { 
    id: 'special', 
    label: 'Um caractere especial (!@#$%^&*)', 
    test: (password: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) 
  },
];

type AuthView = 'login' | 'forgot-password' | 'reset-password' | 'email-sent';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  
  // Password recovery states
  const [authView, setAuthView] = useState<AuthView>('login');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { signIn, signUp, resetPassword, updatePassword, user, role, isLoading: authLoading, isPasswordRecovery, clearPasswordRecovery } = useAuth();
  const navigate = useNavigate();

  // Check if user came from password reset email (via URL or auth event)
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'reset' || isPasswordRecovery) {
      setAuthView('reset-password');
    }
  }, [searchParams, isPasswordRecovery]);

  // Redirect if already logged in (but not during password reset)
  useEffect(() => {
    if (!authLoading && user && authView !== 'reset-password' && !isPasswordRecovery) {
      if (role === 'admin' || role === 'manager') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, role, authLoading, navigate, authView, isPasswordRecovery]);

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
      
      const errorMessage = error.message.toLowerCase();
      
      if (error.message.includes('User already registered')) {
        toast.error('Este e-mail já está cadastrado. Tente fazer login.');
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        toast.error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      } else if (errorMessage.includes('invalid') && errorMessage.includes('email')) {
        toast.error('Formato de e-mail inválido.');
      } else if (errorMessage.includes('weak') || errorMessage.includes('pwned') || (error as any).code === 'weak_password') {
        toast.error('Esta senha é muito comum ou já foi vazada. Por favor, escolha uma senha diferente.');
      } else if (errorMessage.includes('password should be at least')) {
        toast.error('A senha deve ter no mínimo 8 caracteres.');
      } else if (errorMessage.includes('password should contain')) {
        toast.error('A senha deve conter letras, números e caracteres especiais.');
      } else if (errorMessage.includes('password')) {
        toast.error('Erro na senha. Tente uma senha mais forte.');
      } else if (errorMessage.includes('signup is disabled')) {
        toast.error('Cadastro temporariamente desabilitado.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        toast.error('Erro de conexão. Verifique sua internet.');
      } else {
        console.error('Erro não mapeado:', error.message);
        toast.error(`Erro ao criar conta: ${error.message}`);
      }
      return;
    }

    toast.success('Conta criada com sucesso! Bem-vindo à Cali! 🤙');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailValidation = z.string().trim().email('E-mail inválido').safeParse(recoveryEmail);
    
    if (!emailValidation.success) {
      toast.error(emailValidation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(recoveryEmail);
    setIsLoading(false);

    if (error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        toast.error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        toast.error('Erro de conexão. Verifique sua internet.');
      } else {
        // Don't reveal if email exists or not for security
        toast.error('Erro ao enviar e-mail. Tente novamente.');
      }
      return;
    }

    setAuthView('email-sent');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = resetPasswordSchema.safeParse({
      password: newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await updatePassword(newPassword);
    setIsLoading(false);

    if (error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('same as') || errorMessage.includes('different')) {
        toast.error('A nova senha deve ser diferente da anterior.');
      } else if (errorMessage.includes('weak') || errorMessage.includes('pwned')) {
        toast.error('Esta senha é muito comum ou já foi vazada. Escolha outra.');
      } else if (errorMessage.includes('session') || errorMessage.includes('expired')) {
        toast.error('Sessão expirada. Solicite um novo link de recuperação.');
        setAuthView('forgot-password');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        toast.error('Erro de conexão. Verifique sua internet.');
      } else {
        toast.error('Erro ao atualizar senha. Tente novamente.');
      }
      return;
    }

    toast.success('Senha atualizada com sucesso! 🤙');
    clearPasswordRecovery();
    setAuthView('login');
    setNewPassword('');
    setConfirmPassword('');
    navigate('/auth', { replace: true });
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

  // Forgot Password View
  if (authView === 'forgot-password') {
    return (
      <MainLayout>
        <div className="container py-12">
          <button
            onClick={() => setAuthView('login')}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar pro login
          </button>

          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <img
                src={caliLogo}
                alt="Cali"
                className="h-16 w-16 rounded-xl mx-auto mb-4"
              />
              <h1 className="text-2xl font-bold">Esqueceu a senha?</h1>
              <p className="text-muted-foreground">
                Tranquilo! Digita seu e-mail que a gente te manda um link pra criar uma nova
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Label htmlFor="recovery-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recovery-email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-ocean text-primary-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Email Sent Confirmation View
  if (authView === 'email-sent') {
    return (
      <MainLayout>
        <div className="container py-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <img
                src={caliLogo}
                alt="Cali"
                className="h-16 w-16 rounded-xl mx-auto mb-4"
              />
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">E-mail enviado!</h1>
              <p className="text-muted-foreground mt-2">
                Confere sua caixa de entrada. Mandamos um link pra você criar uma nova senha.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Não recebeu? Olha na pasta de spam ou tenta de novo.
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <Button
                onClick={() => setAuthView('login')}
                className="w-full bg-gradient-ocean text-primary-foreground"
              >
                Voltar pro login
              </Button>
              <Button
                variant="outline"
                onClick={() => setAuthView('forgot-password')}
                className="w-full"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Reset Password View (after clicking email link)
  if (authView === 'reset-password') {
    return (
      <MainLayout>
        <div className="container py-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <img
                src={caliLogo}
                alt="Cali"
                className="h-16 w-16 rounded-xl mx-auto mb-4"
              />
              <h1 className="text-2xl font-bold">Criar nova senha</h1>
              <p className="text-muted-foreground">
                Escolhe uma senha forte pra proteger sua conta
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {newPassword.length > 0 && (
                    <div className="mt-3 space-y-1.5 p-3 bg-muted/50 rounded-lg border border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Requisitos da senha:
                      </p>
                      {passwordRequirements.map(req => {
                        const isValid = req.test(newPassword);
                        return (
                          <div key={req.id} className="flex items-center gap-2 text-xs">
                            {isValid ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-red-500" />
                            )}
                            <span className={isValid ? 'text-green-600' : 'text-red-500'}>
                              {req.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <X className="h-3 w-3" />
                      As senhas não coincidem
                    </p>
                  )}
                  {confirmPassword.length > 0 && newPassword === confirmPassword && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Senhas coincidem
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-ocean text-primary-foreground"
                  disabled={isLoading || newPassword !== confirmPassword}
                >
                  {isLoading ? 'Salvando...' : 'Salvar nova senha'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Default Login/Signup View
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
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showLoginPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setAuthView('forgot-password')}
                    className="text-sm text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                  
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
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showSignupPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    {signupPassword.length > 0 && (
                      <div className="mt-3 space-y-1.5 p-3 bg-muted/50 rounded-lg border border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Requisitos da senha:
                        </p>
                        {passwordRequirements.map(req => {
                          const isValid = req.test(signupPassword);
                          return (
                            <div key={req.id} className="flex items-center gap-2 text-xs">
                              {isValid ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <X className="h-3.5 w-3.5 text-red-500" />
                              )}
                              <span className={isValid ? 'text-green-600' : 'text-red-500'}>
                                {req.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
