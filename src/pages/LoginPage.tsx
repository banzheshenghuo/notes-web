import { useState } from 'react';
import { useAuth } from '../lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password || busy) return;
    setBusy(true);
    setErr('');
    try {
      await login(username.trim(), password);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '登录失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="h-dvh flex items-center justify-center px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <div className="text-lg font-medium">notes</div>
        <div className="text-xs text-stone-400 mb-5">个人记录采集器 · 登录后同步云端</div>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="用户名"
          autoCapitalize="off"
          autoCorrect="off"
          className="w-full bg-stone-100 rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-stone-300"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="密码"
          className="w-full mt-3 bg-stone-100 rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-stone-300"
        />
        {err && <div className="text-xs text-red-500 mt-3">{err}</div>}
        <button
          onClick={submit}
          disabled={busy || !username.trim() || !password}
          className="w-full mt-5 bg-stone-800 text-white text-sm py-2.5 rounded-xl active:opacity-70 disabled:opacity-30"
        >
          {busy ? '登录中…' : '登录'}
        </button>
      </div>
    </div>
  );
}
