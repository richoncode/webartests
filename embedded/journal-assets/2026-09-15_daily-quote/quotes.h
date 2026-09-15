#pragma once
// One line a day for the band, when no launch is worth standing outside for.
//
// The brief was classical yet liberal, and empowering: the Stoics and the Greeks
// for self-command, the Enlightenment and the abolitionists for liberty, and a
// few later voices who earned their place in the same argument. Nothing
// devotional, nothing partisan, nothing that reads like a motivational poster.
//
// Attribution is the hard part. Half the quotations that circulate under a
// famous name were written by someone else, so where the popular attribution is
// wrong the real author is credited here — Hall rather than Voltaire, Curran
// rather than Jefferson, Maclaren rather than Plato. A line whose source could
// not be established was left out, however good it sounded.
//
// The day of the year picks the line, so it is fixed for the day and the panel
// repaints once when it turns over. tools/check-quotes.py measures every entry
// against the real font metrics and fails if one cannot fit the band.

struct Quote { const char *text; const char *who; };

static const Quote QUOTES[] = {
  // ── Stoics and the Greeks ────────────────────────────────────────────────
  { "You have power over your mind, not outside events.", "Marcus Aurelius" },
  { "Waste no more time arguing what a good man should be. Be one.", "Marcus Aurelius" },
  { "What stands in the way becomes the way.", "Marcus Aurelius" },
  { "No man is free who is not master of himself.", "Epictetus" },
  { "First say what you would be; then do what you have to do.", "Epictetus" },
  { "It is not what happens to you, but how you react, that matters.", "Epictetus" },
  { "We suffer more often in imagination than in reality.", "Seneca" },
  { "It is not because things are difficult that we do not dare.", "Seneca" },
  { "While we are postponing, life speeds by.", "Seneca" },
  { "Wherever there is a human being, there is a chance for kindness.", "Seneca" },
  { "Character is destiny.", "Heraclitus" },
  { "No one ever steps in the same river twice.", "Heraclitus" },
  { "Knowing yourself is the beginning of all wisdom.", "Aristotle" },
  { "The beginning is the most important part of the work.", "Plato" },
  { "The unexamined life is not worth living.", "Socrates" },
  { "The mind is not a vessel to be filled, but a fire to be kindled.", "Plutarch" },
  { "What we achieve inwardly will change outer reality.", "Plutarch" },
  { "The measure of a man is what he does with power.", "Pittacus of Mytilene" },
  { "The secret of happiness is freedom; the secret of freedom, courage.", "Thucydides" },
  { "Give me a place to stand and I will move the Earth.", "Archimedes" },

  // ── Rome ─────────────────────────────────────────────────────────────────
  { "Fortune favours the bold.", "Virgil" },
  { "They can because they think they can.", "Virgil" },
  { "Dare to be wise.", "Horace" },
  { "I am human: nothing human is alien to me.", "Terence" },
  { "Freedom is participation in power.", "Cicero" },
  { "Life is short, but the memory of a life well spent is eternal.", "Cicero" },

  // ── the Enlightenment ────────────────────────────────────────────────────
  { "Dare to know. Have courage to use your own reason.", "Immanuel Kant" },
  { "Man is born free, and everywhere he is in chains.", "Jean-Jacques Rousseau" },
  { "The mind can make a heaven of hell, a hell of heaven.", "John Milton" },
  { "Give me the liberty to know, to utter, and to argue freely.", "John Milton" },
  { "We have it in our power to begin the world over again.", "Thomas Paine" },
  { "The world is my country, and to do good is my religion.", "Thomas Paine" },
  { "Those who trade liberty for safety deserve neither.", "Benjamin Franklin" },
  { "The condition upon which liberty is given is eternal vigilance.", "John Philpot Curran" },
  { "I will defend to the death your right to say it.", "E. B. Hall, on Voltaire" },
  { "I do not wish women to have power over men, but over themselves.", "Mary Wollstonecraft" },

  // ── liberty, argued for ──────────────────────────────────────────────────
  { "Power concedes nothing without a demand. It never did.", "Frederick Douglass" },
  { "Without struggle, there is no progress.", "Frederick Douglass" },
  { "Once you learn to read, you will be forever free.", "Frederick Douglass" },
  { "I would rather be a rebel than a slave.", "Emmeline Pankhurst" },
  { "Liberty means responsibility. That is why most dread it.", "George Bernard Shaw" },
  { "Justice delayed is justice denied.", "William Gladstone" },
  { "Injustice anywhere is a threat to justice everywhere.", "Martin Luther King Jr." },
  { "The arc of the moral universe bends toward justice.", "Martin Luther King Jr." },
  { "Freedom is never given; it must be demanded.", "Martin Luther King Jr." },
  { "Speak your mind, even if your voice shakes.", "Maggie Kuhn" },
  { "Well-behaved women seldom make history.", "Laurel Thatcher Ulrich" },
  { "I am not free while any woman is unfree.", "Audre Lorde" },
  { "We do not live single-issue lives.", "Audre Lorde" },

  // ── self-command ─────────────────────────────────────────────────────────
  { "I am the master of my fate, the captain of my soul.", "W. E. Henley" },
  { "Whoso would be a man must be a nonconformist.", "Ralph Waldo Emerson" },
  { "Self-trust is the first secret of success.", "Ralph Waldo Emerson" },
  { "Go confidently in the direction of your dreams.", "Henry David Thoreau" },
  { "Man can elevate his life by conscious endeavour.", "Henry David Thoreau" },
  { "Resist much, obey little.", "Walt Whitman" },
  { "I exist as I am, that is enough.", "Walt Whitman" },
  { "Act as if what you do makes a difference. It does.", "William James" },
  { "The great use of life is to spend it for something that outlasts it.", "William James" },
  { "Begin to be now what you will be hereafter.", "Saint Jerome" },
  { "A ship in harbour is safe, but that is not what ships are built for.", "John A. Shedd" },
  { "Be kind, for everyone you meet is fighting a hard battle.", "Ian Maclaren" },
  { "Nothing is so strong as gentleness, nothing so gentle as strength.", "Francis de Sales" },
  { "When in doubt, pause and reflect with the minority.", "Mark Twain" },
  { "We are all in the gutter, but some of us are looking at the stars.", "Oscar Wilde" },
  { "Nothing in life is to be feared, only understood.", "Marie Curie" },
  { "I was taught that the way of progress was neither swift nor easy.", "Marie Curie" },
  { "It is not the mountain we conquer, but ourselves.", "Edmund Hillary" },

  // ── the modern argument ──────────────────────────────────────────────────
  { "One must still have chaos in oneself to give birth to a dancing star.", "Friedrich Nietzsche" },
  { "One who has a why to live can bear almost any how.", "Friedrich Nietzsche" },
  { "Within me there lay an invincible summer.", "Albert Camus" },
  { "Freedom is nothing but a chance to be better.", "Albert Camus" },
  { "We are our choices.", "Jean-Paul Sartre" },
  { "One is not born, but rather becomes, a woman.", "Simone de Beauvoir" },
  { "Nothing will work unless you do.", "Maya Angelou" },
  { "If you don't like something, change it. If you can't, change your view.", "Maya Angelou" },
  { "You must do the things you think you cannot do.", "Eleanor Roosevelt" },
  { "The best way to predict the future is to invent it.", "Alan Kay" },
};

static const int QUOTE_COUNT = sizeof(QUOTES) / sizeof(QUOTES[0]);

// Day of the year, so the line is fixed for the day and turns over at midnight.
inline const Quote &quoteForDay(int yday) {
  int i = yday % QUOTE_COUNT;
  return QUOTES[i < 0 ? i + QUOTE_COUNT : i];
}
