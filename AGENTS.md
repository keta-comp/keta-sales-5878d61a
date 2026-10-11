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

- Keep legacy CRM entry points in the shared dashboard navigation, deduplicate configured module links, and make navigation scroll independently so all sections stay reachable on short screens.
- Use TanStack Router's exported error props for route error components so their signatures follow the installed router contract.
- Keep the legacy lead Kanban on the existing leads query and authenticated updateLead operation, sharing status grouping with its tests, so board and table cannot diverge from CRM data or authorization.
