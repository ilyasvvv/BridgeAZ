import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import CountryCombobox from "../components/CountryCombobox";
import GoogleAuthButton, { isGoogleAuthAvailable } from "../components/GoogleAuthButton";
import { useAuth } from "../utils/auth";
import { resolvePostLoginPath } from "../utils/authFlow";

const SIGNUP_STEPS = [
  { id: "role", label: "Role" },
  { id: "details", label: "Details" },
  { id: "security", label: "Security" }
];

const ROLE_OPTIONS = [
  {
    value: "personal",
    title: "Personal account",
    subtitle: "Meet people, join circles, stay visible"
  },
  {
    value: "circle",
    title: "Create a circle",
    subtitle: "A community page with members at the center"
  }
];

const PREVIEW_TOKENS = ["People", "Circles", "Mentors", "Advice"];

const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);
const isValidUsername = (value) => /^[a-z0-9._]{3,24}$/i.test(value);

function AuthField({ label, className = "", ...props }) {
  return (
    <label className={`auth-field ${className}`.trim()}>
      <span className="auth-field-label">{label}</span>
      <input className="auth-input" {...props} />
    </label>
  );
}

function StepDots({ activeStep }) {
  return (
    <div className="auth-stepper" aria-label="Sign up progress">
      {SIGNUP_STEPS.map((step, index) => (
        <div
          key={step.id}
          className={`auth-step ${index <= activeStep ? "is-active" : ""}`}
          aria-current={index === activeStep ? "step" : undefined}
        >
          <span className="auth-step-dot">{index + 1}</span>
          <span>{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function OrbitPreview({ mode, step }) {
  return (
    <div className="auth-visual">
      <div className="auth-copy">
        <span className="auth-badge">BizimCircle</span>
        <h1>{mode === "login" ? "Back to your circle." : "Find your circle abroad."}</h1>
        <p>{mode === "login" ? "Pick up where you left off." : "Fast sign up. Less typing. Better matching."}</p>
        <div className="auth-preview-row">
          {PREVIEW_TOKENS.map((token, index) => (
            <span
              key={token}
              className={`auth-preview-pill ${mode === "register" && step === index % 3 ? "is-highlighted" : ""}`}
            >
              {token}
            </span>
          ))}
        </div>
      </div>

      <div className={`auth-orbit auth-orbit-${mode}`}>
        <div className="auth-orbit-ring auth-orbit-ring-outer"></div>
        <div className="auth-orbit-ring auth-orbit-ring-middle"></div>
        <div className="auth-orbit-ring auth-orbit-ring-inner"></div>

        <div className="auth-orbit-core">
          <span className="auth-core-mark">iii</span>
          <div className="auth-core-wordmark">
            <span>bizim</span>
            <span className="font-serif">circle</span>
          </div>
        </div>

        <div className="auth-orbit-node auth-orbit-node-a">people</div>
        <div className="auth-orbit-node auth-orbit-node-b">circles</div>
        <div className="auth-orbit-node auth-orbit-node-c">mentors</div>
      </div>
    </div>
  );
}

export default function Join({ initialMode = "register" }) {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [mode, setMode] = useState(initialMode);
  const [signupStep, setSignupStep] = useState(0);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    accountType: "personal",
    currentRegion: ""
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError("");
  }, [initialMode]);

  useEffect(() => {
    if (user) {
      navigate(resolvePostLoginPath(user), { replace: true });
    }
  }, [navigate, user]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    navigate(nextMode === "login" ? "/login" : "/join");
  };

  const updateLoginField = (name, value) => {
    setError("");
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateRegisterField = (name, value) => {
    setError("");
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  };

  const isCircleSignup = registerForm.accountType === "circle";

  const validateSignupStep = (step) => {
    if (step === 1) {
      if (!registerForm.name.trim()) return "Add your name.";
      if (!isValidUsername(registerForm.username)) return "Use a unique username with 3-24 letters, numbers, dots, or underscores.";
      if (!isValidEmail(registerForm.email)) return "Add a valid email.";
      if (!registerForm.currentRegion.trim()) return "Add your current country.";
    }

    if (step === 2) {
      if (registerForm.password.trim().length < 8) return "Use at least 8 characters.";
    }

    return "";
  };

  const goToNextStep = () => {
    const validationError = validateSignupStep(signupStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setSignupStep((prev) => Math.min(prev + 1, SIGNUP_STEPS.length - 1));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const data = await apiClient.post("/auth/login", loginForm);
      login(data.token, data.user);
      navigate(resolvePostLoginPath(data.user));
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    const validationError = validateSignupStep(1) || validateSignupStep(2);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const data = await apiClient.post("/auth/register", registerForm);
      login(data.token, data.user);
      navigate(resolvePostLoginPath(data.user));
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const motionKey = mode === "login" ? "login" : `register-${signupStep}`;

  return (
    <section className="auth-shell">
      <div className="auth-grid">
        <OrbitPreview mode={mode} step={signupStep} />

        <div className="auth-panel">
          <div className="auth-panel-top">
            <div className="auth-switcher" role="tablist" aria-label="Auth mode">
              <span className={`auth-switcher-indicator ${mode === "login" ? "is-login" : "is-register"}`}></span>
              <button
                type="button"
                className={`auth-switcher-btn ${mode === "login" ? "is-active" : ""}`}
                onClick={() => switchMode("login")}
              >
                Log in
              </button>
              <button
                type="button"
                className={`auth-switcher-btn ${mode === "register" ? "is-active" : ""}`}
                onClick={() => switchMode("register")}
              >
                Sign up
              </button>
            </div>

            {mode === "register" && <StepDots activeStep={signupStep} />}
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <div key={motionKey} className="auth-motion-block">
            {mode === "login" ? (
              <form className="space-y-5" onSubmit={handleLogin}>
                <div className="auth-section-copy">
                  <h2>Welcome back</h2>
                  <p>Sign in with email or username.</p>
                </div>

                <div className="space-y-3">
                  <AuthField
                    label="Email or username"
                    type="text"
                    value={loginForm.email}
                    onChange={(event) => updateLoginField("email", event.target.value)}
                    placeholder="you@example.com or yourname"
                    required
                  />
                  <AuthField
                    label="Password"
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => updateLoginField("password", event.target.value)}
                    placeholder="Password"
                    required
                  />
                </div>

                <div className="auth-inline-row">
                  <button type="button" className="auth-link-button" onClick={() => switchMode("register")}>
                    Create account
                  </button>
                  <Link to="/forgot-password" className="auth-link-button">
                    Forgot password
                  </Link>
                </div>

                <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
                  {isSubmitting ? "Logging in..." : "Log in"}
                </button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleRegister}>
                {signupStep === 0 ? (
                  <>
                    <div className="auth-section-copy">
                      <h2>Pick your lane</h2>
                      <p>You can change direction later.</p>
                    </div>

                    <div className="auth-role-grid">
                      {ROLE_OPTIONS.map((role) => (
                        <button
                          key={role.value}
                          type="button"
                          className={`auth-role-card ${registerForm.accountType === role.value ? "is-selected" : ""}`}
                          onClick={() => updateRegisterField("accountType", role.value)}
                        >
                          <span className="auth-role-dot"></span>
                          <strong>{role.title}</strong>
                          <span>{role.subtitle}</span>
                        </button>
                      ))}
                    </div>

                    <button type="button" className="auth-primary-button" onClick={goToNextStep}>
                      Continue
                    </button>
                  </>
                ) : null}

                {signupStep === 1 ? (
                  <>
                    <div className="auth-section-copy">
                      <h2>Just the basics</h2>
                      <p>{isCircleSignup ? "Give the community its public identity." : "Enough to make matching useful."}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <AuthField
                        className="sm:col-span-2"
                        label={isCircleSignup ? "Circle name" : "Name"}
                        type="text"
                        value={registerForm.name}
                        onChange={(event) => updateRegisterField("name", event.target.value)}
                        placeholder={isCircleSignup ? "Community name" : "Full name"}
                        required
                      />
                      <AuthField
                        className="sm:col-span-2"
                        label="Username"
                        type="text"
                        value={registerForm.username}
                        onChange={(event) => updateRegisterField("username", event.target.value.toLowerCase())}
                        placeholder={isCircleSignup ? "yourcircle" : "yourname"}
                        required
                      />
                      <AuthField
                        className="sm:col-span-2"
                        label="Email"
                        type="email"
                        value={registerForm.email}
                        onChange={(event) => updateRegisterField("email", event.target.value)}
                        placeholder="you@example.com"
                        required
                      />
                      <CountryCombobox
                        id="join-country"
                        label={isCircleSignup ? "Base country" : "Country"}
                        value={registerForm.currentRegion}
                        onChange={(nextValue) => updateRegisterField("currentRegion", nextValue)}
                        rootClassName="sm:col-span-2"
                        labelClassName="auth-field-label"
                        inputClassName="auth-input mt-0"
                        listClassName="auth-country-list"
                        itemClassName="auth-country-item"
                      />
                    </div>

                    <div className="auth-inline-row">
                      <button type="button" className="auth-secondary-button" onClick={() => setSignupStep(0)}>
                        Back
                      </button>
                      <button type="button" className="auth-primary-button" onClick={goToNextStep}>
                        Continue
                      </button>
                    </div>
                  </>
                ) : null}

                {signupStep === 2 ? (
                  <>
                    <div className="auth-section-copy">
                      <h2>Secure it</h2>
                      <p>One password. You are in.</p>
                    </div>

                    <div className="space-y-3">
                      <AuthField
                        label="Password"
                        type="password"
                        value={registerForm.password}
                        onChange={(event) => updateRegisterField("password", event.target.value)}
                        placeholder="At least 8 characters"
                        minLength={8}
                        required
                      />
                      <p className="auth-helper-text">Use 8+ characters.</p>
                    </div>

                    <div className="auth-inline-row">
                      <button type="button" className="auth-secondary-button" onClick={() => setSignupStep(1)}>
                        Back
                      </button>
                      <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
                        {isSubmitting ? "Creating..." : "Create account"}
                      </button>
                    </div>
                  </>
                ) : null}
              </form>
            )}
          </div>

          {isGoogleAuthAvailable ? (
            <>
              <div className="auth-divider">
                <span>or</span>
              </div>

              <div className="auth-google-block">
                <div className="auth-google-copy">
                  <p>{mode === "login" ? "Continue with Google" : "Prefer Google?"}</p>
                  <span>
                    {mode === "login"
                      ? "Use the Google account you already signed up with."
                      : "Your account type, username, and country will be used for first-time setup."}
                  </span>
                </div>

                {mode === "register" ? (
                  <div className="auth-google-role-picker">
                    {ROLE_OPTIONS.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        className={`auth-role-pill ${registerForm.accountType === role.value ? "is-selected" : ""}`}
                        onClick={() => updateRegisterField("accountType", role.value)}
                      >
                        {role.title}
                      </button>
                    ))}
                  </div>
                ) : null}

                <GoogleAuthButton
                  text={mode === "login" ? "signin_with" : "signup_with"}
                  userType={mode === "register" ? registerForm.accountType : ""}
                  accountType={mode === "register" ? registerForm.accountType : ""}
                  username={mode === "register" ? registerForm.username : ""}
                  currentRegion={registerForm.currentRegion}
                  width={420}
                  containerClassName="w-full"
                  onSuccess={(data) => {
                    login(data.token, data.user);
                    navigate(resolvePostLoginPath(data.user));
                  }}
                  onError={(message) => setError(message)}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
