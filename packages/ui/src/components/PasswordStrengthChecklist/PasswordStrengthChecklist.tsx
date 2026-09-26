export interface PasswordRuleResult {
  key: string;
  label: string;
  met: boolean;
}

export interface PasswordStrengthChecklistProps {
  results: PasswordRuleResult[];
}

/**
 * Pure presentational checklist — the caller computes each rule's met/
 * unmet state (packages/app-core's passwordRules.ts + i18n translation)
 * and passes the results in. Keeps packages/ui free of any dependency
 * on packages/app-core (the dependency direction is the other way
 * everywhere else in this monorepo).
 */
export function PasswordStrengthChecklist({ results }: PasswordStrengthChecklistProps) {
  return (
    <ul className="flex flex-col gap-1 rounded-md bg-surface-secondary p-3">
      {results.map((rule) => (
        <li
          key={rule.key}
          className={'text-xs ' + (rule.met ? 'text-success' : 'text-ink-muted')}
        >
          {rule.met ? '✓' : '○'} {rule.label}
        </li>
      ))}
    </ul>
  );
}
