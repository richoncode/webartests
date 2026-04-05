---
marp: true
theme: default
paginate: true
header: 'Marp Presentations in Git — webartests'
footer: '© 2026 webartests'
backgroundColor: #0d0d0d
color: #bbb
style: |
  section {
    background-color: #0d0d0d;
    color: #bbb;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  h1, h2, h3 { color: #fff; }
  a { color: #5b9bd5; }
  code { background: #1a1a1a; color: #f59e0b; }
  footer { color: #555; }
  header { color: #555; border-bottom: 1px solid #2a2a2a; }
---

# <!-- fit --> Marp Presentations in Git
### The Art of Markdown-Based Slides

---

## What is Marp?

Marp (Markdown Presentation Ecosystem) is a tool that allows you to create beautiful slide decks using standard Markdown.

- **Developer Friendly**: Write slides in your favorite editor.
- **Git Integration**: Perfect for version-controlled documentation.
- **Customizable**: Use CSS for styling.
- **Portable**: Export to HTML, PDF, or PPTX.

---

## Basic Syntax

Slides are separated by three dashes (`---`).

```markdown
# Slide 1
Content...

---

# Slide 2
Content...
```

---

## Directives

Directives control the appearance and behavior of the presentation.

- `marp: true`: Enables Marp features.
- `theme`: Choose a built-in theme (e.g., `default`, `gaia`, `uncover`).
- `paginate`: Show page numbers.
- `header` / `footer`: Add consistent text to all slides.
- `backgroundColor` / `color`: Set global colors.

---

## Text Auto-Scaling

Use the `<!-- fit -->` comment in a heading to make it automatically scale to fit the width of the slide.

### <!-- fit --> THIS HEADING SCALES AUTOMATICALLY

---

## Background Images

Marp supports powerful background image features.

- `![bg](url)`: Full background.
- `![bg left](url)`: Split screen (left side).
- `![bg right](url)`: Split screen (right side).
- `![bg brightness:0.5](url)`: Apply filters.

---

## Math and Emoji

You can use KaTeX for math and standard emojis.

- **Math**: $E = mc^2$
- **Emoji**: 🚀 📊 🎨

---

## Custom Styling

Use the `<style>` tag or `style` directive to add custom CSS.

```css
section {
  font-size: 30px;
}
h1 {
  color: #5b9bd5;
}
```

---

## Scoped Styles

You can apply styles to specific slides using `<style scoped>`.

<style scoped>
section {
  background-color: #10b981;
  color: #fff;
}
h1 { color: #fff; }
</style>

# This slide has a different background color!
(Thanks to scoped CSS)

---

## Interactive Elements

Since Marp exports to HTML, you can include interactive elements if your renderer supports them.

- Buttons
- Iframes
- Embedded charts (like Mermaid!)

---

## Summary

Marp brings the "Docs as Code" philosophy to presentations.

1. **Write** in Markdown.
2. **Commit** to Git.
3. **Present** anywhere.

---

## Related Tools

Check out other interactive documentation tools in this lab:

- [📊 Mermaid Diagrams in Git](../mermaid-diagrams-in-git/)
- [🏠 Lab Hub](../)

🚀 **Go forth and present!**
