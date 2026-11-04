
"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { login, signup as signupAction } from "@/action/auth";
import styles from "@/styles/AuthPage.module.css";

/**
 * Authentication mode:
 * - login: Email and password.
 * - signup: Name, email, and password.
 */
type AuthMode = "login" | "signup";

/**
 * Shared authentication page for login and signup.
 *
 * Features:
 * - Conditional form fields based on authentication mode.
 * - Zod validation through Next.js Server Actions.
 * - Field-specific validation errors.
 * - API response messages.
 * - Loading state during submission.
 * - Navigation after successful authentication.
 *
 * @param mode - Determines which authentication form to display.
 */
export default function AuthPage({ mode }: { mode: AuthMode }) {
  // Determine whether the current page is signup or login.
  const signup = mode === "signup";

  // Router for client-side navigation.
  const router = useRouter();

  /**
   * Connect the form to the corresponding Server Action.
   *
   * state: Contains validation errors and API messages.
   * formAction: Submits form data to the selected Server Action.
   * pending: Indicates whether the form is being submitted.
   */
  const [state, formAction, pending] = useActionState(
    signup ? signupAction : login,
    undefined
  );

  /**
   * Redirect after a successful API response.
   *
   * Signup -> Login page
   * Login  -> Dashboard page
   *
   * Note: Login redirection does not establish an authenticated
   * session. Session management must be implemented separately.
   */
  useEffect(() => {
    if (state?.message === "Signup successful") {
      router.replace("/login");
    }

    if (state?.message === "Login successful") {
      router.replace("/dashboard");
    }
  }, [state?.message, router]);

  return (
    <main className={styles.page}>
      {/* =========================================================
          LEFT PANEL: Application branding and dashboard preview
          ========================================================= */}
      <section className={styles.showcase}>
        <div className={styles.showcaseInner}>
          {/* Application logo */}
          <Link href="/login" className={styles.logo}>
            <span className={styles.logoIcon}>↗</span>
            <span>
              apply<span className={styles.logoLight}>wise</span>
            </span>
          </Link>

          <div className={styles.pitch}>
            {/* Application introduction */}
            <div className={styles.eyebrow}>
              <span className={styles.onlineDot} />
              YOUR CAREER, ORGANIZED
            </div>

            <h1>
              Less tracking.
              <br />
              <span>More landing.</span>
            </h1>

            <p>
              Track job applications, monitor their status,
              and manage your job search in one place.
            </p>

            {/* Static dashboard preview */}
            <div className={styles.dashboard}>
              <div className={styles.dashboardTop}>
                <div>
                  <div className={styles.previewOverline}>
                    APPLICATION OVERVIEW
                  </div>
                  <div className={styles.previewHeading}>
                    Your pipeline
                  </div>
                </div>

                <span className={styles.moreDots}>•••</span>
              </div>

              {/* Example application statistics */}
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span>Total applied</span>
                  <strong>24</strong>
                  <small className={styles.positive}>
                    ↗ +6 this week
                  </small>
                </div>

                <div className={styles.stat}>
                  <span>In progress</span>
                  <strong>08</strong>
                  <small>4 interviews</small>
                </div>

                <div className={styles.stat}>
                  <span>Responses</span>
                  <strong>12</strong>
                  <small className={styles.positive}>
                    50% response rate
                  </small>
                </div>
              </div>

              {/* Application activity chart */}
              <div className={styles.chartHeading}>
                Applications over time
                <span>Last 6 weeks</span>
              </div>

              <div className={styles.bars}>
                {[
                  32, 52, 42, 69, 57, 91,
                  71, 100, 64, 86, 78, 98
                ].map((height, index) => (
                  <div
                    className={styles.barTrack}
                    key={index}
                  >
                    <div
                      className={`${styles.bar} ${
                        index === 11 ? styles.barAccent : ""
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                ))}
              </div>

              <div className={styles.chartLabels}>
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
                <span>Week 5</span>
                <span>Week 6</span>
              </div>
            </div>
          </div>

          <div className={styles.showcaseFoot}>
            ✦ A clearer path to your next opportunity.
          </div>
        </div>
      </section>

      {/* =========================================================
          RIGHT PANEL: Authentication form
          ========================================================= */}
      <section className={styles.formSection}>
        {/* Mobile branding */}
        <div className={styles.mobileBrand}>
          <span className={styles.mobileBrandMark}>↗</span>
          applywise
        </div>

        {/* Navigation between login and signup */}
        <div className={styles.topLink}>
          {signup
            ? "Already have an account?"
            : "New to applywise?"}{" "}

          <Link href={signup ? "/login" : "/signup"}>
            {signup ? "Log in" : "Create an account"}
          </Link>
        </div>

        <div className={styles.formContent}>
          {/* Form heading */}
          <div className={styles.formEyebrow}>
            {signup ? "LET'S GET STARTED" : ""}
          </div>

          <h2>
            {signup ? "Create your account" : "Welcome back"}
            <span className={styles.accentPeriod}>.</span>
          </h2>

          <p className={styles.formDescription}>
            {signup
              ? "A little more organization. A lot more opportunity."
              : "Ready to make your next career move?"}
          </p>

          {/* =====================================================
              FORM: Connected to login/signup Server Action
              ===================================================== */}
          <form
            action={formAction}
            className={styles.form}
            noValidate
          >
            {/* Name field - Signup only */}
            {signup && (
              <div className={styles.field}>
                <label htmlFor="full-name">
                  Full name
                </label>

                <input
                  id="full-name"
                  name="name"
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  autoComplete="name"
                  required
                  aria-invalid={Boolean(state?.errors?.name?.length)}
                  aria-describedby="name-error"
                />

                {/* Name validation errors */}
                <div
                  id="name-error"
                  aria-live="polite"
                >
                  {state?.errors?.name?.map((error, index) => (
                    <p
                      key={index}
                      className={styles.error}
                    >
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Email field - Login and Signup */}
            <div className={styles.field}>
              <label htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                aria-invalid={Boolean(state?.errors?.email?.length)}
                aria-describedby="email-error"
              />

              {/* Email validation errors */}
              <div
                id="email-error"
                aria-live="polite"
              >
                {state?.errors?.email?.map((error, index) => (
                  <p
                    key={index}
                    className={styles.error}
                  >
                    {error}
                  </p>
                ))}
              </div>
            </div>

            {/* Password field - Login and Signup */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="password">
                  Password
                </label>

                {/* Password recovery placeholder */}
                {!signup && (
                  <span className={styles.mutedLink}>
                    Forgot password?
                  </span>
                )}
              </div>

              <input
                id="password"
                name="password"
                type="password"
                placeholder={
                  signup
                    ? "Create a password"
                    : "Enter your password"
                }
                autoComplete={
                  signup
                    ? "new-password"
                    : "current-password"
                }
                required
                aria-invalid={Boolean(state?.errors?.password?.length)}
                aria-describedby="password-error"
              />

              {/* Password requirements during signup */}
              {signup && (
                <p className={styles.hint}>
                  Use at least 8 characters for a strong password.
                </p>
              )}

              {/* Password validation errors */}
              <div
                id="password-error"
                aria-live="polite"
              >
                {state?.errors?.password?.map((error, index) => (
                  <p
                    key={index}
                    className={styles.error}
                  >
                    {error}
                  </p>
                ))}
              </div>
            </div>

            {/* Terms for signup / Remember me for login */}
            {signup ? (
              <p className={styles.terms}>
                By creating an account, you agree to our{" "}
                <span>Terms of Service</span> and{" "}
                <span>Privacy Policy</span>.
              </p>
            ) : (
              <label className={styles.remember}>
                <input
                  type="checkbox"
                  name="remember"
                />
                <span>Remember me</span>
              </label>
            )}

            {/* API response message */}
            {state?.message && (
              <p
                className={styles.statusMessage}
                role="status"
                aria-live="polite"
              >
                {state.message}
              </p>
            )}

            {/* Submit button */}
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={pending}
            >
              {pending
                ? "Please wait..."
                : signup
                  ? "Create account"
                  : "Log in"}

              {!pending && <span>→</span>}
            </button>
          </form>

          {/* Alternative authentication link */}
          <p className={styles.bottomPrompt}>
            {signup
              ? "Already tracking with us?"
              : "Don't have an account yet?"}{" "}

            <Link href={signup ? "/login" : "/signup"}>
              {signup ? "Log in" : "Sign up for free"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
