import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { panelCard } from '@/features/member/components/area-shell';
import { changeStudentPresenceVisibility } from '../server/actions';

const messages: Record<string, string> = {
  saved: 'Online visibility updated.',
  missing: 'No account was found with that email.',
  invalid: 'Enter a valid email address.',
};

export function PresenceVisibilityManager({
  accounts,
  result,
}: {
  accounts: { id: string; name: string; email: string }[];
  result?: string | undefined;
}) {
  return (
    <section className={`${panelCard} mt-6 gap-5`} aria-labelledby="presence-visibility-title">
      <div>
        <h2 id="presence-visibility-title" className="text-title font-semibold">
          Online visibility
        </h2>
        <p className="mt-2 text-body text-muted-foreground">
          Hidden accounts do not appear in online lists, counts, or last activity details for
          anyone. Their sign-in and product access stay the same. Only your account can manage this
          list.
        </p>
      </div>
      <form
        action={changeStudentPresenceVisibility}
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
      >
        <div className="flex-1">
          <FloatingLabelInput
            id="presence-hide-email"
            name="email"
            type="email"
            label="Student email"
            autoComplete="off"
            maxLength={254}
            required
          />
        </div>
        <Button name="visibility" value="hidden" size="inline" variant="soft">
          Hide online presence
        </Button>
      </form>
      {result && messages[result] ? (
        <output aria-live="polite" className="text-body text-muted-foreground">
          {messages[result]}
        </output>
      ) : null}
      <h3 className="text-body font-semibold">Hidden accounts</h3>
      {accounts.length ? (
        <ul className="divide-y divide-border">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-body font-semibold break-words">{account.name}</p>
                <p className="text-sm break-all text-muted-foreground">{account.email}</p>
              </div>
              <form action={changeStudentPresenceVisibility}>
                <input type="hidden" name="email" value={account.email} />
                <Button
                  name="visibility"
                  value="visible"
                  size="inline"
                  variant="soft"
                  aria-label={`Show online presence for ${account.name}`}
                >
                  Show again
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-muted-foreground">No accounts are hidden.</p>
      )}
    </section>
  );
}
