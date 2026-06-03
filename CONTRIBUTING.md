# Contributing to Quizo

Thanks for your interest in improving Quizo! 🎉

## Getting Set Up

See the [README](README.md) for full setup instructions. In short, you'll run the
`server` (Node/Express/MongoDB) and the `client` (React/Vite) in separate terminals.

## How to Contribute

1. **Fork** the repository and create your branch from `main`.
2. **Make your changes** with clear, focused commits.
3. **Lint the frontend** with `cd client && npm run lint`.
4. **Test manually** by running a full host + participant session locally.
5. **Open a pull request** describing what you changed and why.

## Commit Messages

Use clear, descriptive commit messages in the present tense:

```
Add timer support to the presenter view
Fix scoring when a player submits no answer
```

## Code Style

- Keep components and handlers small and focused.
- Match the style of the surrounding code.
- Document non-obvious logic with comments.

## Reporting Bugs

Open an issue with clear steps to reproduce, your OS, and your Node.js version.
