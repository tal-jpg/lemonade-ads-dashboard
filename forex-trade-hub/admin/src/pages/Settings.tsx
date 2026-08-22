import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCollection, orderBy, limit } from '../hooks/useCollection';
import { ms } from '../lib/types';
import { formatDateTime, titleCase } from '../lib/format';
import { EmptyState, Field, TableSkeleton, errorMessage, useToast } from '../components/ui';

type Settings = {
  signalLimits: { freePerDay: number; premiumPerDay: number; freeHistoryLimit: number };
  features: Record<string, boolean>;
  products: { monthly: string; quarterly: string; yearly: string };
  legal: { termsUrl: string; privacyUrl: string; supportEmail: string; riskDisclaimer: string };
  maintenance: { enabled: boolean; message?: string };
};

const DEFAULTS: Settings = {
  signalLimits: { freePerDay: 3, premiumPerDay: 6, freeHistoryLimit: 20 },
  features: {
    communityEnabled: true,
    pollsEnabled: true,
    newsEnabled: true,
    educationEnabled: true,
    subscriptionsEnabled: true,
    requireCommunityApproval: true,
  },
  products: {
    monthly: 'forextradehub.premium.monthly',
    quarterly: 'forextradehub.premium.quarterly',
    yearly: 'forextradehub.premium.yearly',
  },
  legal: {
    termsUrl: '',
    privacyUrl: '',
    supportEmail: '',
    riskDisclaimer: '',
  },
  maintenance: { enabled: false, message: '' },
};

/**
 * Runtime configuration.
 *
 * These values are the app's business rules — signal allowances, feature flags,
 * store product ids and legal copy. Changing them here takes effect in every
 * installed app within seconds, with no release.
 */
export function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const snap = await getDoc(doc(db, 'app_settings', 'config'));
        if (snap.exists()) {
          const d = snap.data() as Partial<Settings>;
          setSettings({
            signalLimits: { ...DEFAULTS.signalLimits, ...(d.signalLimits ?? {}) },
            features: { ...DEFAULTS.features, ...(d.features ?? {}) },
            products: { ...DEFAULTS.products, ...(d.products ?? {}) },
            legal: { ...DEFAULTS.legal, ...(d.legal ?? {}) },
            maintenance: { ...DEFAULTS.maintenance, ...(d.maintenance ?? {}) },
          });
        }
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'app_settings', 'config'), settings, { merge: true });
      toast.success('Settings saved — live in the app immediately');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <TableSkeleton rows={6} cols={2} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Business rules, applied without a release</p>
        </div>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <h2 className="card-title">Signal allowances</h2>
          <div className="form-grid">
            <Field label="Free signals per day">
              <input
                className="input mono"
                type="number"
                min={0}
                value={settings.signalLimits.freePerDay}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    signalLimits: {
                      ...settings.signalLimits,
                      freePerDay: Number.parseInt(e.target.value, 10) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="Premium signals per day">
              <input
                className="input mono"
                type="number"
                min={0}
                value={settings.signalLimits.premiumPerDay}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    signalLimits: {
                      ...settings.signalLimits,
                      premiumPerDay: Number.parseInt(e.target.value, 10) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="Free history limit" hint="How far back a free account can scroll.">
              <input
                className="input mono"
                type="number"
                min={1}
                value={settings.signalLimits.freeHistoryLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    signalLimits: {
                      ...settings.signalLimits,
                      freeHistoryLimit: Number.parseInt(e.target.value, 10) || 20,
                    },
                  })
                }
              />
            </Field>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Feature flags</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(settings.features).map(([key, value]) => (
              <label key={key} className="checkbox">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      features: { ...settings.features, [key]: e.target.checked },
                    })
                  }
                />
                {titleCase(key.replace(/Enabled$/, ''))}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 14 }}>
        <div className="card">
          <h2 className="card-title">Store product IDs</h2>
          <p className="hint" style={{ marginTop: -8, marginBottom: 12 }}>
            Must match the identifiers configured in App Store Connect and the Play Console.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(['monthly', 'quarterly', 'yearly'] as const).map((period) => (
              <Field key={period} label={titleCase(period)}>
                <input
                  className="input mono"
                  value={settings.products[period]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      products: { ...settings.products, [period]: e.target.value },
                    })
                  }
                />
              </Field>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Maintenance</h2>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.maintenance.enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maintenance: { ...settings.maintenance, enabled: e.target.checked },
                })
              }
            />
            Maintenance mode
          </label>
          <Field label="Message shown to users" hint="Displayed while maintenance mode is on.">
            <textarea
              className="textarea"
              style={{ minHeight: 80 }}
              value={settings.maintenance.message ?? ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maintenance: { ...settings.maintenance, message: e.target.value },
                })
              }
            />
          </Field>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="card-title">Legal and support</h2>
        <div className="form-grid">
          <Field label="Terms URL">
            <input
              className="input"
              value={settings.legal.termsUrl}
              onChange={(e) => setSettings({ ...settings, legal: { ...settings.legal, termsUrl: e.target.value } })}
            />
          </Field>
          <Field label="Privacy policy URL">
            <input
              className="input"
              value={settings.legal.privacyUrl}
              onChange={(e) => setSettings({ ...settings, legal: { ...settings.legal, privacyUrl: e.target.value } })}
            />
          </Field>
          <Field label="Support email">
            <input
              className="input"
              value={settings.legal.supportEmail}
              onChange={(e) => setSettings({ ...settings, legal: { ...settings.legal, supportEmail: e.target.value } })}
            />
          </Field>
        </div>
        <Field
          label="Risk disclaimer"
          hint="Shown throughout the app wherever signals or performance figures appear."
        >
          <textarea
            className="textarea"
            value={settings.legal.riskDisclaimer}
            onChange={(e) =>
              setSettings({ ...settings, legal: { ...settings.legal, riskDisclaimer: e.target.value } })
            }
          />
        </Field>
      </div>

      <AuditLog />
    </div>
  );
}

function AuditLog() {
  const { data, loading } = useCollection(
    'admin_logs',
    (d) => {
      const v = d.data();
      return {
        id: d.id,
        actorName: (v.actorName as string) ?? '',
        action: (v.action as string) ?? '',
        targetType: (v.targetType as string) ?? '',
        targetId: (v.targetId as string) ?? '',
        createdAt: ms(v.createdAt),
      };
    },
    [orderBy('createdAt', 'desc'), limit(40)],
    ['audit-log'],
  );

  return (
    <div style={{ marginTop: 24 }}>
      <h2 className="card-title" style={{ fontSize: 16 }}>
        Audit log
      </h2>
      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : data.length === 0 ? (
        <EmptyState title="No admin activity recorded yet" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr key={entry.id}>
                  <td className="cell-sub">{formatDateTime(entry.createdAt)}</td>
                  <td>{entry.actorName}</td>
                  <td className="mono">{entry.action}</td>
                  <td className="cell-sub mono">
                    {entry.targetType}/{entry.targetId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
