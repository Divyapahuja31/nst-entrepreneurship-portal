# Contributors Guide

Welcome to the project! This document outlines the contribution workflow, branching strategies, and Git standards required to merge your code into this repository.

---

## Branching Strategy

To keep the project history organized, we use a structured naming convention for all branches. Never commit directly to the `main` branch.

Create your branch from `main` using one of the following prefixes:

- **`feature/`** — For adding new API routes, models, or backend functionality (e.g., `feature/user-authentication`).
- **`bugfix/`** — For fixing broken code, unhandled server crashes, or logic errors (e.g., `bugfix/jwt-expiration-issue`).
- **`docs/`** — For updates to documentation, comments, or README specifications (e.g., `docs/api-endpoints`).

### How to create your branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

---

## Contribution Workflow

Follow these steps to submit your contributions successfully:

### 1. Code & Test Locally

Write your backend logic ensuring your server spins up locally without throwing database connection or Mongoose initialization crashes.

### 2. Run Quality Gates Before Committing

Staging your files and attempting a commit will automatically trigger our quality tools (ESLint, Prettier, and Code Spell Checker):

```bash
git add .
git commit -m "feat: implement user registration endpoint"
```

*If the quality gates fail, read the terminal output carefully, fix the errors, run `git add` again, and re-commit.*

### 3. Push to Remote

Once your commit passes local validation checks successfully, push your branch to GitHub:

```bash
git push origin feature/your-feature-name
```

### 4. Open a Pull Request (PR)

1. Go to the GitHub repository web page.
2. Click on **Compare & pull request**.
3. Provide a clear title and a brief description of what your code changes achieve.
4. Request a review from your instructor or assigned peer group.

---

## Commit Message Conventions

We follow clean semantic commit formatting. Keep your commit summaries short, sweet, and descriptive. Use the following prefixes:

- `feat:` A new feature or endpoint (e.g., `feat: add mongoose schema for products`)
- `fix:` A bug fix (e.g., `fix: catch express async errors in controller`)
- `docs:` Changes to documentation or markdown files (e.g., `docs: add contributors guide`)
- `refactor:` Rewriting code without changing its external behavior (e.g., `refactor: clean up modular routing structure`)

---

## Core Contributors

Thank you to everyone helping build, maintain, and learn from this project!

- [Divya Pahuja](https://github.com/Divyapahuja31)
- [Kanishk Ranjan](https://github.com/KanishkRanjan)
- [Krit Garg](https://github.com/kritgarg)
- [Raghav Khandelwal](https://github.com/raghav581)
- [Krushn Dayshmookh](https://github.com/krushndayshmookh)
