import Reveal from "./Reveal.jsx";
import SayHelloBadge from "./SayHelloBadge.jsx";
import ContactForm from "./ContactForm.jsx";

export default function ContactSection() {
  return (
    <section className="contact" id="contact">
      <div className="shell">
        <div className="contact-grid">
          <div>
            <SayHelloBadge style={{ marginBottom: 26 }} />
            <Reveal>
              <h2 className="h1">Let’s Work Together</h2>
            </Reveal>
            <Reveal delay={1}>
              <p className="lead" style={{ marginTop: 20 }}>
                Hiring, collaborating on a paper, or stuck on a retrieval problem —
                tell me what you’re building and I’ll tell you honestly whether I’m
                the right person for it.
              </p>
            </Reveal>
          </div>

          <Reveal delay={1}>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
