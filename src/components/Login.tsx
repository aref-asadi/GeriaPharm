import { useState } from "react";
import { LockKeyhole, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import { login, type Session } from "../services/api";
import { Button, IconButton, Notice } from "./ui/Primitives";
export function Login({
  onLogin,
  onBack,
}: {
  onLogin: (s: Session) => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [visible, setVisible] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="login-layout">
      <section className="login-card">
        <span className="login-icon">
          <LockKeyhole size={29} />
        </span>
        <div className="eyebrow">دسترسی ویژه مدیر</div>
        <h2>ورود به مدیریت گریافارم</h2>
        <p>برای مدیریت داروها و اطلاعات بالینی، وارد حساب خود شوید.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              onLogin(await login(email.trim(), password));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            ایمیل مدیر
            <input
              type="email"
              dir="ltr"
              autoComplete="username"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </label>
          <label>
            رمز عبور
            <div className="password-field">
              <input
                dir="ltr"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={1024}
              />
              <IconButton
                type="button"
                label={visible ? "پنهان کردن رمز" : "نمایش رمز"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={19} /> : <Eye size={19} />}
              </IconButton>
            </div>
          </label>
          {error && <Notice tone="error">{error}</Notice>}
          <Button busy={busy} type="submit" className="full-width">
            ورود امن <ArrowLeft size={18} />
          </Button>
        </form>
        <button className="text-button" onClick={onBack}>
          بازگشت به مرجع دارویی
        </button>
      </section>
      <aside className="login-aside">
        <ShieldCheck size={43} />
        <h3>دانش مشترک، دسترسی کنترل‌شده</h3>
        <p>
          مطالعه راهنمای داروها برای همه آزاد است. افزودن و ویرایش اطلاعات، تنها
          توسط مدیر تأییدشده انجام می‌شود.
        </p>
        <ul>
          <li>ورود با نشست امن و زمان‌دار</li>
          <li>ثبت تاریخچه تغییرات فهرست</li>
          <li>مطالعه آفلاین؛ ویرایش متصل به سرور</li>
        </ul>
      </aside>
    </div>
  );
}
