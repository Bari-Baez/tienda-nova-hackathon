import { CONTACT, EVENT, PRIVACY_NOTE } from '../../data/event';
import Logo from './Logo';
import s from './SiteFooter.module.css';

export default function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={`shell ${s.inner}`}>
        <div className={s.brand}>
          <Logo />
          <p className={s.line}>
            {EVENT.dateLong} · {EVENT.venue}, {EVENT.room}
          </p>
        </div>

        <div className={s.right}>
          <a className={s.mail} href={CONTACT.emailHref}>
            {CONTACT.email}
          </a>
          <p className={s.privacy}>{PRIVACY_NOTE}</p>
        </div>
      </div>
    </footer>
  );
}
