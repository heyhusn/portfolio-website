import Socials from "./Socials.jsx";
import { useStore } from "../store.js";

export default function Footer() {
  // Was reading the frozen src/data/profile.js import directly, so editing
  // name/email/phone/location from the admin dashboard never showed up here
  // even though every other page reads the live store.
  const profile = useStore((s) => s.profile);
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer__top">
          <div>
            <div className="footer__k">Email</div>
            <a className="footer__v" href={`mailto:${profile.email}`}>
              {profile.email}
            </a>
          </div>
          <div>
            <div className="footer__k">Call today</div>
            <a className="footer__v" href={profile.phoneHref}>
              {profile.phone}
            </a>
          </div>
          <div>
            <div className="footer__k">Social</div>
            <Socials style={{ marginTop: 8 }} />
          </div>
        </div>
        <div className="footer__rule" />
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} {profile.name}. All rights reserved.</span>
          <span>{profile.location}</span>
        </div>
      </div>
    </footer>
  );
}
