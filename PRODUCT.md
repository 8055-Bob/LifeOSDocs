# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Adults aged roughly 20–40 who want a practical daily system for reflection, habits, goals and self-development. They commonly use the app on a phone in short moments during or after the day, and may prefer speaking a thought rather than writing it.

## Product Purpose

LifeOS is a personal AI-assisted life companion. It turns written or spoken thoughts into a structured reflection, helps people make progress on habits and goals, and helps them notice patterns over time.

## Positioning

One Life Record can begin as a free-form thought or voice note and become a useful, private structured record: summary, emotions, themes, reflection question and a small next action. The product connects this reflection with habits, goals and long-term insights.

## Operating Context

The primary loop is: open the app, capture a thought, receive an AI analysis, then revisit past entries, habits, goals and insights. The application currently connects to a LifeOS API and Supabase for account data and persistence. It is implemented as an Expo/React Native mobile application.

## Capabilities and Constraints

- Text diary input, voice recording/transcription, and AI analysis.
- Email authentication and private user data stored through Supabase.
- Diary history, deletion, habits, goals and weekly insights.
- Android system Back must return to the previous context; phone navigation uses bottom destinations.
- The app must remain usable on compact Android phones and should adapt for iOS and larger screens.
- Current product language is Russian. A dark theme and iOS-specific visual polish remain open decisions.

## Brand Commitments

The name is LifeOS. The product should feel like a calm, respectful, capable companion rather than a social network, a game, or a clinical diagnostic tool. It should help the person act in real life rather than encourage dependence on the app.

## Evidence on Hand

Working Expo application source: `apps/mobile/App.js`. A running MVP has been tested by the product owner on an Android phone. The project has no approved logo, photography, customer testimonials or commercial claims that may be invented.

## Product Principles

1. Capture first: sharing a thought must be faster and easier than organizing it manually.
2. Explain, do not pronounce: AI conclusions are useful hypotheses, not facts about a person.
3. Small actions beat vague motivation.
4. Personal data and control belong to the user.
5. The interface should lower mental load, especially when the user is tired or stressed.

## Accessibility & Inclusion

Support readable Russian text, clear states for recording and loading, adequate contrast, 48 dp touch targets, safe-area layout and system Back navigation. Do not encode emotional meaning by color alone.
