import { GitHub, LinkedIn, XLogo, Mail } from "./Icons.jsx";
import { useStore } from "../store.js";

const ICONS = { github: GitHub, linkedin: LinkedIn, x: XLogo, email: Mail };

export default function Socials({ style }) {
  // Was reading the frozen src/data/profile.js import directly, so editing
  // social links from the admin dashboard never showed up here.
  const socials = useStore((s) => s.profile?.socials) || [];
  return (
    <div className="socials" style={style}>
      {socials.map((s) => {
        const Icon = ICONS[s.kind] ?? Mail;
        return (
          <a
            key={s.kind}
            href={s.href}
            aria-label={s.label}
            target={s.href.startsWith("http") ? "_blank" : undefined}
            rel={s.href.startsWith("http") ? "noreferrer noopener" : undefined}
          >
            <Icon />
          </a>
        );
      })}
    </div>
  );
}
