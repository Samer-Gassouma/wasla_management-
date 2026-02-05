import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, setAuthToken } from "@/api/client";

type Props = { onLoggedIn: (token: string, staffInfo: { firstName: string; lastName: string; role: string }) => void };

export default function LoginScreen({ onLoggedIn }: Props) {
  const [cin, setCin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await login(cin.trim()) as any;
      const { token, staff } = response.data;
      try {
        localStorage.setItem("authToken", token);
        localStorage.setItem("staffInfo", JSON.stringify({
          firstName: staff.firstName,
          lastName: staff.lastName,
          role: staff.role
        }));
      } catch {}
      setAuthToken(token);
      onLoggedIn(token, { firstName: staff.firstName, lastName: staff.lastName, role: staff.role });
  } catch (e: any) {
      setError(e?.message || "Échec de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-2xl border-2 border-primary/10">
        {/* Branding */}
        <div className="flex flex-col items-center select-none">
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* Wasla logo */}
            <div className="relative">
              <img src="icons/logo.png" alt="Wasla" className="w-20 h-20 object-contain -translate-y-1 drop-shadow-lg" />
              <div className="absolute -inset-1 bg-primary/20 rounded-full blur-xl -z-10"></div>
            </div>
            {/* Backslash accent */}
            <div className="w-1 h-12 bg-primary -skew-x-12 opacity-40 rounded-full"></div>
            {/* STE logo (same size) */}
            <div className="relative">
              <img src="icons/ste.png" alt="STE Dhraiff Services Transport" className="w-20 h-20 object-contain rounded-full bg-white p-1 translate-y-1 shadow-lg" />
              <div className="absolute -inset-1 bg-primary/20 rounded-full blur-xl -z-10"></div>
            </div>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Wasla Management
            </h1>
            <p className="text-sm text-muted-foreground">STE Dhraiff Services Transport</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Numéro CIN</label>
            <Input 
              value={cin} 
              onChange={(e) => setCin(e.target.value)} 
              placeholder="Saisissez votre CIN (8 chiffres)"
              className="h-11 text-base"
              maxLength={8}
              autoFocus
            />
          </div>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}
          <Button 
            className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all" 
            type="submit" 
            disabled={loading || !cin.trim()}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Connexion en cours...
              </span>
            ) : (
              "Se connecter"
            )}
          </Button>
        </form>
        
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-center text-muted-foreground">
            Accès réservé au personnel autorisé uniquement
          </p>
        </div>
      </Card>
    </div>
  );
}


