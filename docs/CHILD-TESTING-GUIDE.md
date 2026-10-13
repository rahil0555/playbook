# Testing PlayLab with a real device and early learners

For a parent, teacher or team member who has never opened the code. Plan about **45 minutes** for the device checks and
**10–15 minutes per child** for the supervised session. You need the test build (the zip, or `dist/` from the repository),
a laptop, and any phone or tablet you can use.

> **What has and has not been tested.** The team's automated tests run the app in a desktop browser (Chromium) at
> phone, tablet and desktop widths. They have **not** been run on a real phone, tablet or with a child. Real speech
> voices differ between devices and are only heard on a real device. Everything in this guide is therefore a
> **test**, not a verification.

---

## 1. Open the build on your computer

1. Unzip `playlab-…zip` into a folder. Keep the folder structure as it is.
2. Open the folder in a terminal (macOS: right-click the folder → *New Terminal at Folder*; Windows: open the folder,
   click the address bar, type `cmd` and press Enter).
3. Run the command for your system. It needs **Python 3**, which most computers already have:
   - macOS / Linux: `python3 serve.py`
   - Windows: `py serve.py` (or `python serve.py`)
4. A browser opens at **http://localhost:8080/**. If it does not, open that address yourself.
5. Leave the terminal window open while you test. Press **Ctrl+C** in it to stop.

**Other devices on the same Wi-Fi (tablet or phone):** stop the server, run `python3 serve.py --lan`, and type the
address the terminal prints (for example `http://192.168.1.20:8080/`) into the other device's browser. Both devices must
be on the same Wi-Fi network. Do **not** double-click `index.html`: browsers block PlayLab's scripts when a file is opened
directly.

**Developers only:** from the repository, `npm install`, then `npm run build` and `npm run preview` (serves on port 4173),
or `npm run dev` (port 5173).

Nothing needs the internet once the page is open. PlayLab keeps progress only in the browser on that device.

---

## 2. The devices and browsers to try

Use what you have. A good first round is at least one of each:

| Device | Browser | Why |
| --- | --- | --- |
| Small phone (about 320–390 px wide, e.g. an older iPhone SE or a budget Android) | Safari (iPhone) or Chrome (Android) | the narrowest screen; most likely to clip or cover things |
| Tablet (about 768–1024 px) | Safari (iPad) or Chrome (Android tablet) | where most early learners will use it |
| Laptop or desktop (1280 px or wider) | Chrome, Edge, Firefox or Safari | the reference layout and the mouse |

For each device, write down: **device model, operating system version, browser name and version** (the browser's
*About* page shows the version), and the width of the window if you can see it.

---

## 3. Device checks (about 15 minutes per device)

Work through these on each device. Tick what works; write down anything that does not.

**Layout**
- [ ] The whole screen fits. Nothing is cut off at the right edge, and the page does not scroll sideways.
- [ ] Every button can be tapped. No button is hidden under another control or under the sound message.
- [ ] After you finish a Magic Letters word, the **Next word** button is on screen, or it comes into view when the
      message appears.
- [ ] Turn the phone sideways and back. The page still fits and nothing is hidden under the notch or the bar.

**Sound and speech**
- [ ] Tap a letter on the first screen. You hear a sound. (Some browsers stay silent until the first tap: that is expected.)
- [ ] Open **Settings** (gear icon, top right). The **Sound** switch turns sound off and on.
- [ ] With Sound on, tap **Hear the clue** or a letter's name. Speech should start within about a second.
- [ ] If you see a message that **spoken words aren’t available**, write down the device and browser. The pictures and
      sound effects should still work, and the message should go away by itself after a few seconds.
- [ ] In **Settings → Voice**, check the list of voices. Choose one, tap **Preview voice**, and check it is different
      from the automatic voice. Then **Use this voice**.

**Movement**
- [ ] Turn on the device's **Reduce motion** setting (iPhone: *Settings → Accessibility → Motion → Reduce Motion*;
      Android: *Settings → Accessibility → Remove animations*; Windows: *Settings → Accessibility → Visual effects →
      Animation effects off*). Reopen PlayLab. Things should still work and be clear, with less movement.
- [ ] Turn the sound off in PlayLab with the speaker icon. Finish a word. There should be no sound and no speech,
      but the word still counts.

---

## 4. Magic Letters (the word-building game) — the main test

Open **Magic Letters** from the Home screen. Each word has a picture and a clue. The letters are spelt by putting each
letter on its glowing outline. Do each step on each device.

1. **Tap-and-tap:** tap a letter, then tap its outline. The letter should fly to the outline and stay there.
2. **Drag:** press a letter, drag it onto its outline, and let go. It should snap in. Try a drag that misses: the letter
   should spring back to where it came from, without a penalty.
3. **Wrong spot:** put a letter on the wrong outline. The message should be kind ("That letter goes in a different
   spot"), and the letter should go back to the pile. Note whether the word still reads as the answer.
4. **Hint:** after two misses, a hint appears (a glowing spot and a star on a letter). Check it helps and does not give
   the whole word away.
5. **Retry:** tap **Start this word again** or **Shuffle letters**. The letters should be mixed again.
6. **Typing:** on a laptop, type the word on the keyboard, quickly. Each letter should go to the first free outline
   that matches it.
7. **Completion:** finish a word. Check: the picture hops, Pip (the green helper) jumps up beside the picture with a
   little burst of stars, a fanfare plays, and **after** the fanfare the word is said aloud. Then tap **Next word**.
8. **Repeated letters:** find a word with the same letter twice (for example *apple*). Both should go in.
9. **Five words:** finish a whole round. Note whether the summary screen makes sense to you.

Also note: did any letter appear in its outline **before** you placed it? (It must not: the answer is never shown in
advance.) This is a release-blocking problem if it happens.

---

## 5. Sentence Fun

1. Tap the words in the order you would say them. Each word should lift, a spot should glow, and the word should fly
   into it with a small chime.
2. Tap quickly, several words in a row. Every word should end up in its own spot, none should disappear or swap.
3. Put the words in the wrong order, then tap **Check my sentence**. The message should explain which words are right,
   and **Try again** should be there.
4. Put the words in the right order. Check the celebration: the key word appears big for a moment, the fanfare plays,
   and then the whole sentence is read aloud. Tap **Next sentence** as soon as you can. It must work straight away.
5. Fill-in sentences: tap the word that fits the gap. A wrong word should be kind and easy to try again.

---

## 6. The other activities (quick pass)

- **Alphabet:** tap several letters; each should say its name.
- **Phonics:** tap the letters; each should say its sound.
- **Match & Play → Letter ↔ Picture:** tap a card, then its partner. A correct match chimes and joins with a line.
- **Match & Play → Missing Letter:** tap a wrong letter (it should wobble), then the right one (it should fly into the gap).
- **Home and My Stars:** the sticker book on Home and the stars in My Stars should show what you have done.

---

## 7. Leaving and coming back

- Start a spoken word (**Hear the clue**), then tap **Home** straight away. The speech should stop, and no sentence should
  be read out on the Home screen afterwards.
- Start a sentence, switch to another app for a few seconds, and come back. Nothing should be spoken from the
  sentence while you were away.
- Use the browser's **Back** button. The screen should change and any speech should stop.
- Tap around quickly between Home, My Stars and an activity for half a minute. Nothing should break or go blank.

---

## 8. Recording a bug

Write one entry per problem, using this template:

```
Title:            (short, e.g. "Next button hidden under the sound message")
Device / OS:      (e.g. iPhone SE, iOS 17.2)
Browser:          (e.g. Safari 17.2)
Width / orientation: (e.g. 320 px, portrait; or unknown)
Build:            (the zip file name, e.g. playlab-quality-build-caa2d75.zip)
Steps:            1. … 2. … 3. …   (exactly what you tapped, in order)
Expected:         (what should have happened)
Actual:           (what happened)
Frequency:        (every time / sometimes / once)
Sound:            (on / off; could you hear it? yes / no / not sure)
Screenshot or video: (file name)
Severity:         (blocks play / confusing / cosmetic)
```

**Screenshots:** iPhone: side button + volume up. Android: power + volume down. Windows: Windows key + Shift + S.
Mac: Command + Shift + 4. A short screen recording helps a lot for anything that moves.

Send the entries and the files to the team in one place. Do not add a child's name or a photo of a child to a bug report.

---

## 9. Supervised sessions with early learners (ages about 4–10)

**Before you start**
- Ask the child's parent or carer for permission, and explain what you are doing in one sentence.
- Use a quiet room and a device the child can reach. An adult sits next to the child at all times.
- Do not record the child's face or voice. Do not take photographs that show the child. If you must, keep them out of
  the team's files and delete them afterwards.
- Use a first name or a number (for example "Child 1") in your notes, never a surname or a school. Do not record a date
  of birth.
- Stop at any time if the child is tired or upset. Thank the child and the parent.

**During the session (10–15 minutes)**
- Let the child choose a game. Do not coach or give answers. Note where the child hesitates.
- Watch quietly. Write down what the child does, not what you think they meant.
- Ask at most three questions, at the end, in simple words: "What was your favourite thing?", "Was anything tricky?",
  "Did you want to do it again?"

**After the session**
- Fill in the scorecard below. Score what you saw, and note anything the child said, in their words.
- Keep the notes for the team only. Delete any note that contains something that could identify the child.

---

## 10. Scorecard (per child, per device)

Score each line from **1 (very poor) to 5 (very good)**. Write one sentence of evidence for each score.

| Area | What it means | Score | Evidence (what you saw or heard) |
| --- | --- | --- | --- |
| **Engagement** | The child keeps going, comes back to the game, asks to play again | | |
| **Clarity** | The child understands what to do without help (instructions, clues, the Next button) | | |
| **Independence** | The child completes steps alone; how often they asked an adult | | |
| **Frustration** | 5 = calm even after a wrong answer; 1 = gives up or gets upset (score this as *calm*, not as the opposite) | | |
| **Technical reliability** | Nothing blank, stuck, covered or silent that should not be; sound and speech behaved as expected | | |

Also record: session length, number of wrong answers, number of "help" questions to the adult, and any bug numbers
from section 8.

**What this scorecard is and is not.** It is a quick, informal check of whether the app is usable and enjoyable for a few
children in one session. It is **not** evidence that PlayLab teaches reading, and it must not be presented that way.
Educational effectiveness would need a planned study with a comparison group, consent, and an agreed measure.

---

## 11. What blocks a release

Stop and report at once if any of these happens:

- a blank or stuck screen, or a screen that cannot be left;
- a letter or word shown in its outline before the child has placed it;
- a button the child needs covered or off screen (for example Next);
- speech or fanfares talking over each other, or speech continuing after the child has left the screen;
- a child's progress lost, or a finished word not counted;
- any personal information shown or asked for.
