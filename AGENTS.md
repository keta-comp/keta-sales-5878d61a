<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Offer in the shared dashboard navigation only the CRM entry points the tenant's preset keeps: `hiddenRoutesForPreset` (presets.ts) is the single switch for `hiddenCoreKeys` and the always-hidden leads page, so menu, links, dashboard tiles and page guards can never disagree. Still deduplicate configured module links and let navigation scroll independently so all sections stay reachable on short screens.
- Use TanStack Router's exported error props for route error components so their signatures follow the installed router contract.
- The leads section is switched off for every preset: its page redirects to the dashboard, while the lead board stays wired to the existing leads query and authenticated updateLead operation (sharing status grouping with its tests) so lead records created from Telegram conversations remain correct and authorised.
