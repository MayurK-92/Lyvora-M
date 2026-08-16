# Lyvora - Product Requirements Document (PRD)

**Version:** 1.0 (MVP)

**Status:** Draft

**Product Type:** AI-Powered Personal Knowledge & Memory Platform

**Platform:** Web Application (Mobile-First)

---

# 1. Vision

## Mission

Build the world's smartest personal memory.

Lyvora transforms everything users save online into structured, searchable, and reusable knowledge.

Instead of saving links that are forgotten forever, users save knowledge they can actually use months or years later.

---

# Vision Statement

> "Everything worth remembering, remembered."

The internet has solved discovery.

Lyvora solves remembering.

---

# 2. The Problem

Every day people discover valuable information.

Examples:

* Instagram recipes
* Amazon products
* YouTube tutorials
* Reddit recommendations
* Blog articles
* Travel destinations
* Fitness advice
* Programming tips
* AI tools
* Movies
* Restaurants
* Books

Today people save these in different places:

* Instagram Saved
* YouTube Watch Later
* Browser Bookmarks
* Notes
* Screenshots
* Wishlists
* WhatsApp
* Telegram
* Emails

After a few weeks they remember:

> "I know I saved it somewhere."

But they cannot find it.

The problem isn't saving.

The problem is **remembering**.

---

# 3. Product Philosophy

Lyvora should never become another bookmark manager.

Users do not want links.

Users want knowledge.

Every piece of content entering Lyvora should answer:

* What is this?
* Why did the user save it?
* What information does it contain?
* When might it become useful?
* How is it related to other saved content?

---

# 4. Core Concept

Instead of storing links...

Lyvora understands them.

Example:

Instagram Reel

↓

Share to Lyvora

↓

AI watches the reel

↓

Extracts knowledge

↓

Organizes automatically

↓

Searchable forever

---

# 5. Product Goal

The product should become the user's external memory.

Eventually users should stop asking:

> "Where did I save that?"

Instead they ask:

> "Show me the healthy pasta recipe I saved last year."

---

# 6. Target Users

Primary

* Students
* Software Engineers
* Professionals
* Creators
* Lifelong learners

Secondary

* Fitness enthusiasts
* Travelers
* Home cooks
* Shoppers
* Researchers

---

# 7. User Journey

## First Time User

User creates account.

↓

Empty workspace.

↓

Lyvora explains:

"Whenever you find something interesting online, share it here."

↓

User installs browser extension (future).

↓

User installs mobile application (future).

↓

Starts saving content.

---

# 8. Content Sources

MVP

* URL
* Text
* PDF
* Image

Future

* Instagram
* YouTube
* Amazon
* Flipkart
* Reddit
* X
* LinkedIn
* Medium
* GitHub
* Gmail
* Notion

The application should be designed so that adding a new source requires minimal changes to the rest of the system.

---

# 9. Capture Philosophy

Everything starts with Capture.

Capture must take less than 10 seconds.

Users should never organize content manually.

AI should organize everything automatically.

---

# 10. Universal Capture

Every supported source enters the same pipeline.

Input

↓

Understand Source

↓

Extract Content

↓

Understand Meaning

↓

Create Structured Memory

↓

Store

↓

Search

---

# 11. Knowledge Object

Every saved item becomes a Knowledge Object.

It is not merely a URL.

A Knowledge Object contains:

* Original URL
* Title
* Summary
* Category
* Tags
* Key entities
* Extracted information
* Original media
* AI metadata
* User metadata
* Search embeddings
* Relationships
* Date saved
* Date updated

---

# 12. AI Processing Pipeline

Every new item follows the same lifecycle.

Step 1

Receive content.

Step 2

Detect source.

Step 3

Download metadata.

Step 4

Extract readable information.

Step 5

Understand content.

Step 6

Extract entities.

Step 7

Categorize.

Step 8

Generate summary.

Step 9

Generate searchable knowledge.

Step 10

Store.

---

# 13. Instagram Workflow

User shares reel.

↓

Lyvora receives URL.

↓

Retrieve reel metadata.

↓

Analyze transcript (or speech).

↓

Analyze visuals when needed.

↓

Identify topic.

↓

Extract structured information.

↓

Store.

Example

Recipe Reel

↓

Ingredients

↓

Cooking steps

↓

Cooking time

↓

Cuisine

↓

Difficulty

↓

Nutrition (if available)

↓

Original Reel

---

# 14. Shopping Workflow

User shares Amazon product.

↓

Extract

* Product
* Brand
* Price
* Rating
* Images
* Features
* Specifications

AI generates

* Summary
* Pros
* Cons
* Use cases

Later additional reviews from other sources can enrich the same object.

---

# 15. Travel Workflow

User shares

"Top places in Japan"

Lyvora extracts

* Cities
* Attractions
* Budget
* Season
* Hotels mentioned
* Restaurants mentioned
* Tips

Everything becomes searchable.

---

# 16. Programming Workflow

User shares

Blog

Documentation

GitHub

AI extracts

* Technologies
* Concepts
* Code snippets
* Best practices
* APIs
* Libraries

---

# 17. Fitness Workflow

Example Reel

"Best exercises for lower back"

Lyvora stores

Exercises

Target muscles

Equipment

Difficulty

Warnings

Benefits

Frequency

---

# 18. Knowledge Categories

Categories are AI-generated.

Examples

Recipes

Programming

Fitness

Shopping

Travel

Finance

Movies

Books

Career

Education

Health

Productivity

Business

Technology

Users should rarely need to create folders.

---

# 19. AI Relationships

Lyvora should connect related memories.

Example

User saves

Amazon Laptop

↓

Later

YouTube Review

↓

Later

Reddit Review

↓

Later

Instagram Recommendation

Instead of four separate items

Lyvora creates one connected knowledge page.

---

# 20. Search Philosophy

Search should work like memory.

Instead of keywords only.

Users should search naturally.

Examples

"The protein recipe without eggs."

"The backpack recommended by developers."

"The React article explaining hooks."

"The travel reel about Switzerland."

---

# 21. AI Chat

Chat is not the primary feature.

Chat is another way to access memory.

Example

"What laptops was I considering?"

"What healthy meals have I saved?"

"What do I know about Kubernetes?"

"What restaurants did I save for Goa?"

---

# 22. Personalization

The assistant learns user interests.

Example

Most saved topics

Programming

Fitness

Travel

Cooking

The assistant can recommend

* revisit forgotten content
* similar knowledge
* duplicate content
* outdated information

---

# 23. Weekly Reports

Every week Lyvora generates:

Items saved

Top categories

Most viewed

Never revisited

Recommended revisits

Knowledge growth

Learning trends

---

# 24. Duplicate Detection

If the user saves the same idea multiple times

Lyvora should detect duplicates.

Instead of storing everything separately

Merge intelligently.

---

# 25. Knowledge Growth

Every saved item increases the user's knowledge graph.

The graph connects

Products

People

Companies

Technologies

Recipes

Countries

Movies

Books

Topics

Users should gradually build a digital brain.

---

# 26. Core Principles

Lyvora should always be:

Fast

Minimal

Private

AI-first

Source-aware

Searchable

Contextual

Beautiful

Reliable

---

# 27. MVP Success Criteria

A successful MVP allows users to:

* Save any supported URL.
* Automatically extract useful information.
* Organize content without folders.
* Search naturally.
* Chat with saved knowledge.
* View original sources.
* Rediscover forgotten content.

If users begin using Lyvora instead of Instagram Saved, browser bookmarks, or scattered notes for content they truly want to remember, the MVP has achieved its purpose.

---

# 28. Long-Term Vision

Lyvora is not trying to become another bookmark manager.

Lyvora is building a **memory layer for the internet**.

Every interesting thing a person discovers online should eventually flow through Lyvora.

The system should understand it, connect it with existing knowledge, and make it instantly retrievable years later.

The end goal is simple:

People should never have to remember *where* they saved something again.

They only need to remember **what** they want.

Lyvora remembers the rest.
