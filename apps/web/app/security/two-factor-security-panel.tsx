'use client';

import QRCode from 'react-qr-code';
import { useState, type FormEvent } from 'react';

import { authClient } from '../../lib/auth-client';

type Props = {
  email: string;
  twoFactorEnabled: boolean;
};

type StatusState = {
  error?: string;
  notice?: string;
  pending: boolean;
};

type SetupState = {
  backupCodes: string[];
  totpURI: string;
};

export function TwoFactorSecurityPanel({ email, twoFactorEnabled: initialEnabled }: Props) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialEnabled);
  const [enablePassword, setEnablePassword] = useState('');
  const [managePassword, setManagePassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [enableState, setEnableState] = useState<StatusState>({ pending: false });
  const [verifyState, setVerifyState] = useState<StatusState>({ pending: false });
  const [disableState, setDisableState] = useState<StatusState>({ pending: false });
  const [backupState, setBackupState] = useState<StatusState>({ pending: false });

  async function enableTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnableState({ pending: true });

    const { data, error } = await authClient.twoFactor.enable({
      password: enablePassword.trim()
    });

    if (error || !data) {
      setEnableState({
        pending: false,
        error: describeError(error) ?? 'Não foi possível gerar a configuração de 2FA.'
      });
      return;
    }

    setSetup({
      totpURI: data.totpURI,
      backupCodes: data.backupCodes
    });
    setEnableState({
      pending: false,
      notice: 'Escaneie o QR code e confirme com o código do autenticador.'
    });
    setVerifyState({ pending: false });
    setBackupState({ pending: false });
  }

  async function verifyTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifyState({ pending: true });

    const { error } = await authClient.twoFactor.verifyTotp({
      code: normalizeCode(totpCode),
      trustDevice
    });

    if (error) {
      setVerifyState({
        pending: false,
        error: describeError(error) ?? 'Não foi possível verificar o código.'
      });
      return;
    }

    setTwoFactorEnabled(true);
    setSetup(null);
    setEnablePassword('');
    setTotpCode('');
    window.location.reload();
  }

  async function disableTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDisableState({ pending: true });

    const { error } = await authClient.twoFactor.disable({
      password: managePassword.trim()
    });

    if (error) {
      setDisableState({
        pending: false,
        error: describeError(error) ?? 'Não foi possível desativar a 2FA.'
      });
      return;
    }

    setTwoFactorEnabled(false);
    setSetup(null);
    setManagePassword('');
    window.location.reload();
  }

  async function regenerateBackupCodes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBackupState({ pending: true });

    const { data, error } = await authClient.twoFactor.generateBackupCodes({
      password: managePassword.trim()
    });

    if (error || !data) {
      setBackupState({
        pending: false,
        error: describeError(error) ?? 'Não foi possível gerar novos códigos de backup.'
      });
      return;
    }

    setSetup({
      totpURI: setup?.totpURI ?? '',
      backupCodes: data.backupCodes
    });
    setBackupState({
      pending: false,
      notice: 'Novos códigos de backup foram gerados.'
    });
  }

  return (
    <div className="two-factor-security">
      <section className="two-factor-security__panel">
        <div className="auth-panel__intro">
          <h2>{twoFactorEnabled ? '2FA ativada' : 'Ativar 2FA'}</h2>
          <p>{email}</p>
        </div>

        {enableState.notice ? (
          <div className="auth-banner auth-banner--notice">
            <strong>Próximo passo</strong>
            <p>{enableState.notice}</p>
          </div>
        ) : null}

        {enableState.error ? (
          <div className="auth-banner auth-banner--error">
            <strong>Falha no setup</strong>
            <p>{enableState.error}</p>
          </div>
        ) : null}

        {disableState.error ? (
          <div className="auth-banner auth-banner--error">
            <strong>Falha na remoção</strong>
            <p>{disableState.error}</p>
          </div>
        ) : null}

        {backupState.notice ? (
          <div className="auth-banner auth-banner--notice">
            <strong>Backup codes</strong>
            <p>{backupState.notice}</p>
          </div>
        ) : null}

        {!twoFactorEnabled ? (
          <form className="action-form auth-form" onSubmit={enableTwoFactor}>
            <div className="form-grid form-grid--single">
              <label className="form-field">
                <span>Senha atual</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={enablePassword}
                  onChange={(event) => setEnablePassword(event.target.value)}
                  required
                />
              </label>
            </div>

            <button className="action-button auth-submit" type="submit" disabled={enableState.pending}>
              {enableState.pending ? 'Gerando...' : 'Gerar QR code'}
            </button>
          </form>
        ) : null}

        {setup ? (
          <div className="two-factor-security__setup">
            {setup.totpURI ? (
              <div className="two-factor-security__qr">
                <QRCode value={setup.totpURI} />
              </div>
            ) : null}

            <div className="auth-banner auth-banner--notice">
              <strong>Backup codes</strong>
              <ul className="two-factor-security__codes">
                {setup.backupCodes.map((code) => (
                  <li key={code}>
                    <code>{code}</code>
                  </li>
                ))}
              </ul>
            </div>

            <form className="action-form auth-form" onSubmit={verifyTwoFactor}>
              <div className="form-grid form-grid--single">
                <label className="form-field">
                  <span>Código do autenticador</span>
                  <input
                    name="totpCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={totpCode}
                    onChange={(event) => setTotpCode(event.target.value)}
                    placeholder="000000"
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

              {verifyState.error ? (
                <div className="auth-banner auth-banner--error">
                  <strong>Código inválido</strong>
                  <p>{verifyState.error}</p>
                </div>
              ) : null}

              <button className="action-button auth-submit" type="submit" disabled={verifyState.pending}>
                {verifyState.pending ? 'Verificando...' : 'Confirmar 2FA'}
              </button>
            </form>
          </div>
        ) : null}
      </section>

      {twoFactorEnabled ? (
        <section className="two-factor-security__panel">
          <div className="auth-panel__intro">
            <h2>Gerenciar 2FA</h2>
            <p>Regenere backup codes ou desative a proteção com confirmação de senha.</p>
          </div>

          <form className="action-form auth-form" onSubmit={regenerateBackupCodes}>
            <div className="form-grid form-grid--single">
              <label className="form-field">
                <span>Senha atual</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={managePassword}
                  onChange={(event) => setManagePassword(event.target.value)}
                  required
                />
              </label>
            </div>

            {backupState.error ? (
              <div className="auth-banner auth-banner--error">
                <strong>Falha nos códigos de backup</strong>
                <p>{backupState.error}</p>
              </div>
            ) : null}

            <button className="action-button auth-submit" type="submit" disabled={backupState.pending}>
              {backupState.pending ? 'Gerando...' : 'Gerar novos backup codes'}
            </button>
          </form>

          <form className="action-form auth-form" onSubmit={disableTwoFactor}>
            <div className="form-grid form-grid--single">
              <label className="form-field">
                <span>Senha para desativar</span>
                <input
                  name="disablePassword"
                  type="password"
                  autoComplete="current-password"
                  value={managePassword}
                  onChange={(event) => setManagePassword(event.target.value)}
                  required
                />
              </label>
            </div>

            <button
              className="action-button action-button--critical auth-submit"
              type="submit"
              disabled={disableState.pending}
            >
              {disableState.pending ? 'Desativando...' : 'Desativar 2FA'}
            </button>
          </form>
        </section>
      ) : null}
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

  return 'Erro inesperado.';
}
