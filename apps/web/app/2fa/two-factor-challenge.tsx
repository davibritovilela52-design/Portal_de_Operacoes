'use client';

import { useState, type FormEvent } from 'react';

import { authClient } from '../../lib/auth-client';
import { finalizeTwoFactorAction } from './actions';

type SubmitState = {
  error?: string;
  pending: boolean;
};

export function TwoFactorChallenge() {
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [totpState, setTotpState] = useState<SubmitState>({ pending: false });
  const [backupState, setBackupState] = useState<SubmitState>({ pending: false });

  async function submitTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTotpState({ pending: true });

    try {
      await authClient.twoFactor.verifyTotp({
        code: normalizeCode(totpCode),
        trustDevice
      });

      const finalizeResult = await finalizeTwoFactorAction();

      if (!finalizeResult.ok) {
        setTotpState({
          pending: false,
          error: finalizeResult.message
        });
        return;
      }

      window.location.assign('/dashboard');
    } catch (error) {
      setTotpState({
        pending: false,
        error: describeError(error)
      });
      return;
    }

    setTotpState({ pending: false });
  }

  async function submitBackupCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBackupState({ pending: true });

    try {
      await authClient.twoFactor.verifyBackupCode({
        code: normalizeCode(backupCode),
        trustDevice
      });

      const finalizeResult = await finalizeTwoFactorAction();

      if (!finalizeResult.ok) {
        setBackupState({
          pending: false,
          error: finalizeResult.message
        });
        return;
      }

      window.location.assign('/dashboard');
    } catch (error) {
      setBackupState({
        pending: false,
        error: describeError(error)
      });
      return;
    }

    setBackupState({ pending: false });
  }

  return (
    <div className="auth-form auth-form--stacked">
      <form className="action-form auth-form" onSubmit={submitTotp}>
        <div className="form-grid form-grid--single">
          <label className="form-field">
            <span>Código do autenticador</span>
            <input
              name="totpCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={totpCode}
              onChange={(event) => setTotpCode(event.target.value)}
              required
            />
          </label>
        </div>

        <label className="form-field auth-form__checkbox">
          <input
            name="trustDevice"
            type="checkbox"
            checked={trustDevice}
            onChange={(event) => setTrustDevice(event.target.checked)}
          />
          <span>Confiar neste dispositivo por 30 dias</span>
        </label>

        {totpState.error ? (
          <div className="auth-banner auth-banner--error">
            <strong>Código inválido</strong>
            <p>{totpState.error}</p>
          </div>
        ) : null}

        <button className="action-button auth-submit" type="submit" disabled={totpState.pending}>
          {totpState.pending ? 'Verificando...' : 'Validar código'}
        </button>
      </form>

      <div className="auth-banner auth-banner--notice">
        <strong>Código de backup</strong>
        <p>Use um código de emergência se você não tiver acesso ao autenticador.</p>
      </div>

      <form className="action-form auth-form" onSubmit={submitBackupCode}>
        <div className="form-grid form-grid--single">
          <label className="form-field">
            <span>Código de backup</span>
            <input
              name="backupCode"
              autoComplete="one-time-code"
              placeholder="ABCD-EFGH-IJ"
              value={backupCode}
              onChange={(event) => setBackupCode(event.target.value)}
              required
            />
          </label>
        </div>

        {backupState.error ? (
          <div className="auth-banner auth-banner--error">
            <strong>Código inválido</strong>
            <p>{backupState.error}</p>
          </div>
        ) : null}

        <button
          className="action-button auth-submit"
          type="submit"
          disabled={backupState.pending}
        >
          {backupState.pending ? 'Verificando...' : 'Usar código de backup'}
        </button>
      </form>
    </div>
  );
}

function normalizeCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').trim();
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Falha inesperada na verificação.';
}
