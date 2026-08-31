import { useState, useRef, forwardRef } from "react";
import { ArrowUpRight } from "./Icons.jsx";
import { useStore } from "../store.js";

const CONTACT_ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT || "";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMPTY = { name: "", email: "", service: "", message: "" };

const ContactForm = forwardRef(function ContactForm({ className, ...rest }, ref) {
  const { siteContent, profile } = useStore();
  const serviceOptions = siteContent?.serviceOptions || [];
  
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const liveRef = useRef(null);

  const update = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
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
    if (!validate()) {
      const first = e.currentTarget.querySelector("[aria-invalid='true']");
      first?.focus();
      return;
    }

    if (!CONTACT_ENDPOINT) {
      const subject = encodeURIComponent(
        `Portfolio enquiry — ${values.service || "General"}`
      );
      const body = encodeURIComponent(
        `${values.message}\n\n— ${values.name}\n${values.email}`
      );
      window.location.href = `mailto:${profile?.email}?subject=${subject}&body=${body}`;
      setStatus("sent");
      setValues(EMPTY);
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
        <label htmlFor="f-msg">Tell me about it</label>
        <textarea
          placeholder="A sentence or two about the problem…"
          {...fieldProps("message", "Message")}
          id="f-msg"
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
        {CONTACT_ENDPOINT
          ? "Thanks — your message is on its way. Expect a reply within two working days."
          : "Thanks — your mail client should be opening with the message ready to send."}
      </div>

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
