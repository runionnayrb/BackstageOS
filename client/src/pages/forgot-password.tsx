import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset email");
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <Link href="/auth" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to login
          </Link>

          {isSubmitted ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Check Your Email
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Don't see it? Check your spam folder, or{" "}
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail("");
                  }}
                  className="text-primary hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Forgot Password?
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    data-testid="input-forgot-email"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                  data-testid="button-send-reset"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
