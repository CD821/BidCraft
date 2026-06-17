import { useState } from "react";
import { Icon } from "./Icon";

export function AuthView({ loading, message, onSignIn, onSignUp }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const isSignup = mode === "signup";

  async function submit(event) {
    event.preventDefault();
    if (isSignup) {
      await onSignUp(email, password, fullName);
    } else {
      await onSignIn(email, password);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-white">Bid</span>
          <span className="brand-orange">Craft</span>
          <small>BUILD SMART. BID CONFIDENT.</small>
        </div>
        <div className="auth-copy">
          <h1>{isSignup ? "Create your account" : "Sign in to BidCraft"}</h1>
          <p>
            Use one account to work inside your company, keep estimates
            separate, and save changes to the cloud.
          </p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {isSignup ? (
            <label>
              Full name
              <input
                autoComplete="name"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Carlos Diaz"
                value={fullName}
              />
            </label>
          ) : null}
          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
              type="password"
              value={password}
            />
          </label>
          {message ? <p className="auth-message">{message}</p> : null}
          <button className="button primary auth-submit" disabled={loading} type="submit">
            <Icon name={isSignup ? "plus" : "check"} size={17} />
            {loading ? "Working..." : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          className="auth-switch"
          onClick={() => setMode(isSignup ? "signin" : "signup")}
          type="button"
        >
          {isSignup
            ? "Already have an account? Sign in"
            : "Need an account? Create one"}
        </button>
      </section>
    </main>
  );
}
