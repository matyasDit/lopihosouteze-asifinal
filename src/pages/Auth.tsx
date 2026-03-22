import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trophy, Sparkles, Mail, Lock, User, Loader2 } from 'lucide-react';
import alikLogo from '@/assets/alik-logo.png';
import { useOAuth } from '@/hooks/useOAuth';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Neplatný email'),
  password: z.string().min(6, 'Heslo musí mít alespoň 6 znaků'),
});

const signupSchema = loginSchema.extend({
  username: z.string().min(3, 'Jméno musí mít alespoň 3 znaky').max(20, 'Jméno může mít max 20 znaků'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const { startOAuthFlow } = useOAuth();
  
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', username: '' });

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = loginSchema.safeParse(loginForm);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Nesprávný email nebo heslo');
      } else {
        toast.error('Chyba při přihlášení');
      }
    } else {
      toast.success('Úspěšně přihlášeno!');
      navigate('/');
    }
  };

  // SIGNUP
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signupSchema.safeParse(signupForm);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.username);
    setLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Tento email je již registrován');
      } else {
        toast.error('Chyba při registraci');
      }
    } else {
      toast.success('Účet vytvořen! Nyní se přihlaš.');
      setSignupForm({ email: '', password: '', username: '' });
    }
  };

  // FORGOT PASSWORD
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!z.string().email().safeParse(resetEmail).success) {
      toast.error('Neplatný email');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    setLoading(false);

    if (error) {
      toast.error('Chyba při odesílání emailu');
    } else {
      toast.success('Email s odkazem pro reset hesla byl odeslán!');
      setShowForgotPassword(false);
      setResetEmail('');
    }
  };

  // OAUTH
  const handleOAuthLogin = async () => {
    setOauthLoading(true);
    try {
      await startOAuthFlow();
    } catch (error) {
      toast.error('Chyba při přihlašování přes Alíka');
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-success/20 rounded-full blur-2xl animate-pulse-slow" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-hero border-0 bg-card/95 backdrop-blur-sm animate-scale-in">
        {/* Header */}
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow animate-bounce-subtle">
            <Trophy className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-display font-bold gradient-text">
              Lopiho Soutěž
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Připoj se do soutěže
              <Sparkles className="w-4 h-4 text-primary" />
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* OAuth Button (Prominent) */}
          <Button
            variant="hero"
            size="lg"
            className="w-full gap-3 text-base h-12"
            disabled={oauthLoading}
            onClick={handleOAuthLogin}
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Přesměrovávám...
              </>
            ) : (
              <>
                <img src={alikLogo} alt="Alík" className="w-5 h-5" />
                Přihlásit se přes Alíka
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Nebo</span>
            </div>
          </div>

          {/* Email & Password Tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login" className="text-sm">Přihlášení</TabsTrigger>
              <TabsTrigger value="signup" className="text-sm">Registrace</TabsTrigger>
            </TabsList>

            {/* LOGIN TAB */}
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-xs font-medium">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="tvuj@email.cz"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="h-10"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-xs font-medium">
                    Heslo
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="h-10"
                    disabled={loading}
                  />
                </div>

                <Button type="submit" className="w-full h-10" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Přihlašuji...
                    </>
                  ) : (
                    'Přihlásit se'
                  )}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="w-full text-center text-xs text-primary hover:underline"
              >
                Zapomenuté heslo?
              </button>
            </TabsContent>

            {/* SIGNUP TAB */}
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-xs font-medium">
                    Přezdívka
                  </Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="tvoje_przezdivka"
                    value={signupForm.username}
                    onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                    className="h-10"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-xs font-medium">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="tvuj@email.cz"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    className="h-10"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-xs font-medium">
                    Heslo
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    className="h-10"
                    disabled={loading}
                  />
                </div>

                <Button type="submit" className="w-full h-10" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registruji...
                    </>
                  ) : (
                    'Vytvořit účet'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Privacy note */}
          <p className="text-xs text-muted-foreground text-center">
            Přihlášením souhlasíš s našimi{' '}
            <a href="/pravidla-ochrana-ou" className="text-primary hover:underline">
              pravidly a ochranou
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Obnovit heslo</DialogTitle>
            <DialogDescription>
              Zadej svůj email a pošleme ti odkaz pro reset hesla.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm">
                Email
              </Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="tvuj@email.cz"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowForgotPassword(false)}
                disabled={loading}
              >
                Zrušit
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Odesílám...
                  </>
                ) : (
                  'Odeslat'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
