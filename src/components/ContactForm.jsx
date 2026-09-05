import { useState, useRef, forwardRef } from "react";
import { ArrowUpRight } from "./Icons.jsx";
import { useStore } from "../store.js";

const CONTACT_ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT || "";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMPTY = { name: "", email: "", service: "", message: "" };

/** The plain-text body used by both the mailto handoff and the copy button. */
const composeBody = (v) => `${v.message}\n\n— ${v.name}\n${v.email}`;

const ContactForm = forwardRef(function ContactForm({ className, ...rest }, ref) {
  const { siteContent, profile } = useStore();
  const serviceOptions = siteContent?.serviceOptions || [];
  
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [copied, setCopied] = useState(false);
  const liveRef = useRef(null);

  const update = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(composeBody(values));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked (insecure context, or the visitor declined). The
      // message is still on screen to select by hand, so there is nothing
      // useful to say here.
    }
  };

  const validate = () => {
    const next = {};
    if (!values.name.trim()) next.name = "Your name, so I know who I'm replying to.";
    if (!values.email.trim()) next.email = "An email address is needed for a reply.";
    else if (!EMAIL_RE.test(values.email)) next.email = "That address doesn't look right.";
    if (!values.message.trim()) next.message = "A sentence about the project is enough.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    // The submit button is already disabled while a request is in flight, but
    // a form can be submitted without pressing it — Enter in any text field
    // does it, and a disabled button does not stop that. This is the guard
    // that actually prevents a double send.
    if (status === "sending") return;
    if (!validate()) {
      const first = e.currentTarget.querySelector("[aria-invalid='true']");
      first?.focus();
      return;
    }

    if (!CONTACT_ENDPOINT) {
      /* No endpoint configured, so this hands off to the visitor's mail
         client. Nothing here can find out whether that worked: a machine with
         no mail client registered — which describes most people on webmail —
         simply does nothing, and the page gets no event either way.

         So this deliberately does NOT claim the message was sent, and does NOT
         clear the form. What the visitor typed stays on screen, and the panel
         below gives them the address and a copy button, so a failed handoff
         costs them a click rather than their whole message. */
      window.location.href = `mailto:${profile?.email}?subject=${encodeURIComponent(
        `Portfolio enquiry — ${values.service || "General"}`
      )}&body=${encodeURIComponent(composeBody(values))}`;
      setStatus("handoff");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("sent");
      setValues(EMPTY);
    } catch {
      setStatus("error");
    }
  };

  const fieldProps = (name, label) => ({
    id: `f-${name}`,
    name,
    value: values[name],
    onChange: update(name),
    "aria-invalid": errors[name] ? "true" : undefined,
    "aria-describedby": errors[name] ? `f-${name}-err` : undefined,
    "aria-label": label,
  });

  return (
    <form
      className={["form", className].filter(Boolean).join(" ")}
      id="contactForm"
      noValidate
      onSubmit={onSubmit}
      // Screen readers get the same "something is happening" signal the
      // button's label gives everyone else.
      aria-busy={status === "sending" ? "true" : undefined}
      ref={ref}
      {...rest}
    >
      <div className="form__row">
        <div className="field">
          <label htmlFor="f-name">Name</label>
          <input type="text" placeholder="Your name" {...fieldProps("name", "Name")} />
          {errors.name && (
            <p className="field__err" id="f-name-err">
              {errors.name}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="f-email">Email</label>
          <input
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            {...fieldProps("email", "Email")}
          />
          {errors.email && (
            <p className="field__err" id="f-email-err">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="f-service">What's this about?</label>
        <select {...fieldProps("service", "Subject")}>
          <option value="">Select…</option>
          {serviceOptions.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="f-message">Tell me about it</label>
        <textarea
          placeholder="A sentence or two about the problem…"
          {...fieldProps("message", "Message")}
        />
        {errors.message && (
          <p className="field__err" id="f-message-err">
            {errors.message}
          </p>
        )}
      </div>

      <div
        className={`form__ok${status === "sent" ? " is-on" : ""}`}
        role="status"
        aria-live="polite"
        ref={liveRef}
      >
        Thanks — your message is on its way. Expect a reply within two working
        days.
      </div>

      {status === "handoff" && (
        <div className="form__ok is-on" role="status" aria-live="polite">
          <p style={{ margin: "0 0 10px" }}>
            Your mail client should be opening with this message ready to send.
            Nothing happened? Then it isn&rsquo;t set up on this machine — copy
            the message and send it to{" "}
            <a href={`mailto:${profile?.email}`}>{profile?.email}</a>.
          </p>
          <button type="button" className="btn btn--sm" onClick={copyMessage}>
            {copied ? "Copied" : "Copy the message"}
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="form__err" role="alert">
          That didn't go through. Email {profile.email} directly and it will reach me.
        </div>
      )}

      <div>
        <button className="btn btn--lime btn--lg" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Submit"}
          <ArrowUpRight className="btn__arrow" />
        </button>
      </div>
      <p className="form__note">Replies usually land within two working days.</p>
    </form>
  );
});

export default ContactForm;
