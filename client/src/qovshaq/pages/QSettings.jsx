// Qovshaq Phase 3 — User settings & privacy
import { useState } from "react";
import { useAuth } from "../../utils/auth";
import { qApi } from "../utils/qApi";
import QCard from "../components/QCard";
import QButton from "../components/QButton";
import QLocationPicker from "../components/QLocationPicker";

export default function QSettings() {
  const { user, token, setUser } = useAuth();
  const [location, setLocation] = useState(
    user?.qLocation || { country: "", countryCode: "", city: "", region: "" }
  );
  const [privacy, setPrivacy] = useState(
    user?.qPrivacy || {
      profileVisibility: "everyone",
      messagePermission: "everyone",
      locationPrecision: "city",
    }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await qApi.completeOnboarding(
        { location, interests: user?.qInterests || [] },
        token
      );
      setUser((prev) => ({ ...prev, ...updated }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  return (
    <div>
      <h1 className="font-q-display text-2xl text-q-text mb-5">Settings</h1>

      <div className="space-y-5">
        <QCard className="p-5">
          <h2 className="font-q-display text-lg text-q-text mb-4">Location</h2>
          <QLocationPicker value={location} onChange={setLocation} />
        </QCard>

        <QCard className="p-5">
          <h2 className="font-q-display text-lg text-q-text mb-4">Privacy</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-q-text mb-1.5">
                Who can see your profile
              </label>
              <select
                value={privacy.profileVisibility}
                onChange={(e) =>
                  setPrivacy((p) => ({ ...p, profileVisibility: e.target.value }))
                }
                className="w-full px-4 py-2.5 bg-q-surface border border-q-border rounded-lg text-sm text-q-text outline-none"
              >
                <option value="everyone">Everyone</option>
                <option value="community">Community only</option>
                <option value="connections">Connections only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-q-text mb-1.5">
                Who can message you
              </label>
              <select
                value={privacy.messagePermission}
                onChange={(e) =>
                  setPrivacy((p) => ({ ...p, messagePermission: e.target.value }))
                }
                className="w-full px-4 py-2.5 bg-q-surface border border-q-border rounded-lg text-sm text-q-text outline-none"
              >
                <option value="everyone">Everyone</option>
                <option value="connections">Connections only</option>
                <option value="none">No one</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-q-text mb-1.5">
                Location precision shown to others
              </label>
              <select
                value={privacy.locationPrecision}
                onChange={(e) =>
                  setPrivacy((p) => ({ ...p, locationPrecision: e.target.value }))
                }
                className="w-full px-4 py-2.5 bg-q-surface border border-q-border rounded-lg text-sm text-q-text outline-none"
              >
                <option value="city">City level</option>
                <option value="region">Region level</option>
                <option value="country">Country only</option>
              </select>
            </div>
          </div>
        </QCard>

        <div className="flex items-center gap-3">
          <QButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </QButton>
          {saved && (
            <span className="text-sm text-q-success">Settings saved successfully</span>
          )}
        </div>
      </div>
    </div>
  );
}
