// OtpVerification – "enter the code we emailed you" step for 2-step sign-in and signup verification
import { useEffect, useRef } from 'react';

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function OtpVerification({
    email,
    flow,
    demoCode,
    code,
    onCodeChange,
    secondsLeft,
    resendIn,
    onSubmit,
    onResend,
    onBack,
    loading,
    resending,
    error,
    length = 6,
}) {
    const inputRef = useRef(null);
    useEffect(() => { inputRef.current?.focus(); }, []);

    const isSignup = flow === 'register';
    const expired = secondsLeft <= 0;

    return (
        <>
            <button
                type="button" onClick={onBack}
                className="mb-4 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
            >
                ← Back
            </button>

            <div className="w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center text-lg mb-4">✉️</div>
            <h2 className="text-lg font-extrabold text-zinc-900 mb-0.5 tracking-tight">
                {isSignup ? 'Verify your email' : 'Check your email'}
            </h2>
            <p className="text-sm text-zinc-500 mb-5">
                {isSignup ? 'To finish creating your account, enter' : 'For your security, enter'} the {length}-digit
                code we sent to <span className="font-semibold text-zinc-800 break-all">{email}</span>
            </p>

            {demoCode && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <span className="font-semibold">Demo mode:</span> your code is{' '}
                    <span className="font-mono font-bold text-sm tracking-widest">{demoCode}</span>
                </div>
            )}

            <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="otp-code" className="text-sm font-semibold text-zinc-700">Verification code</label>
                    <input
                        id="otp-code" ref={inputRef}
                        type="text" inputMode="numeric" autoComplete="one-time-code"
                        pattern="[0-9]*" maxLength={length}
                        placeholder={'•'.repeat(length)}
                        value={code}
                        onChange={e => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, length))}
                        className="
                            w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3
                            text-center font-mono text-2xl tracking-[0.5em] text-zinc-900
                            placeholder:text-zinc-300 outline-none
                            transition-[border-color,box-shadow] duration-150
                            focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10
                        "
                    />
                    <p className={`text-xs ${expired ? 'text-red-500' : 'text-zinc-400'}`}>
                        {expired
                            ? 'This code has expired. Request a new one below.'
                            : `Code expires in ${formatTime(secondsLeft)}`}
                    </p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                        <span>⚠</span> {error}
                    </div>
                )}

                <button
                    type="submit" disabled={loading || code.length !== length || expired}
                    className="mt-1 w-full py-3 rounded-xl bg-zinc-900 text-white text-sm font-bold
                        hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center justify-center gap-2 transition-colors duration-150"
                >
                    {loading
                        ? <div className="spinner flex-shrink-0" style={{ width: 18, height: 18 }} />
                        : isSignup ? 'Verify & Create Account →' : 'Verify & Sign In →'}
                </button>
            </form>

            <p className="mt-5 text-center text-xs text-zinc-400">
                Didn&apos;t get it? Check your spam folder, or{' '}
                <button
                    type="button" onClick={onResend} disabled={resending || resendIn > 0}
                    className="text-zinc-700 font-semibold hover:underline
                        disabled:text-zinc-400 disabled:no-underline disabled:cursor-not-allowed"
                >
                    {resending ? 'sending…' : resendIn > 0 ? `resend in ${formatTime(resendIn)}` : 'resend the code'}
                </button>
            </p>
        </>
    );
}
