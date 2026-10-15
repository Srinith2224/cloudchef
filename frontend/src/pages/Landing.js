import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Page from '../components/Page';
import Icon from '../components/Icon';
import '../styles/pages/landing.css';

const FEATURES = [
  {
    icon: 'timer',
    title: 'Cook mode with real timers',
    text: 'Big, clear steps you can follow with flour on your hands. Each step has its own timer, and the screen stays awake.'
  },
  {
    icon: 'calendar_month',
    title: 'Plan the week',
    text: 'Drop recipes onto breakfast, lunch or dinner for any day. See the whole week at a glance.'
  },
  {
    icon: 'shopping_basket',
    title: 'Shopping list that adds itself',
    text: 'Send all ingredients from a recipe to your list in one tap. Same items merge, and you tick them off in the shop.'
  },
  {
    icon: 'photo_camera',
    title: 'Snap your fridge',
    text: 'Take a photo of what you have. The AI chef suggests a recipe you can make right now.'
  }
];

const line = {
  hidden: { opacity: 0, y: 28 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] } })
};

export default function Landing() {
  return (
    <Page className="landing">
      <section className="hero">
        <motion.div
          className="hero__photo"
          style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/food-background.webp)` }}
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        />
        <div className="hero__shade" aria-hidden />

        <div className="hero__content">
          <h1 className="hero__title">
            <motion.span custom={0} variants={line} initial="hidden" animate="show">Tonight&rsquo;s dinner,</motion.span>
            <motion.span custom={1} variants={line} initial="hidden" animate="show">one clear step</motion.span>
            <motion.span custom={2} variants={line} initial="hidden" animate="show">at a time.</motion.span>
          </h1>
          <motion.p className="hero__lead" custom={3} variants={line} initial="hidden" animate="show">
            Find recipes from home cooks, follow them in cook mode, plan your week and keep one shopping list.
          </motion.p>
          <motion.div className="hero__actions" custom={4} variants={line} initial="hidden" animate="show">
            <Link to="/auth?mode=signup" className="btn btn-primary btn-lg">Create free account</Link>
            <Link to="/explore" className="btn btn-ghost btn-lg hero__browse">
              <Icon name="travel_explore" />Browse recipes
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="features" aria-label="What you can do">
        {FEATURES.map((f) => (
          <article key={f.title} className="feature">
            <span className="feature__icon"><Icon name={f.icon} /></span>
            <h2 className="feature__title">{f.title}</h2>
            <p className="feature__text">{f.text}</p>
          </article>
        ))}
      </section>

      <section className="landing-cta">
        <img src="/cloudcheflogo.png" alt="" className="landing-cta__logo" />
        <h2>Your recipes, your kitchen.</h2>
        <p>Share what you cook, save what others make, and never lose a family recipe again.</p>
        <Link to="/auth?mode=signup" className="btn btn-primary btn-lg">Start cooking</Link>
      </section>

      <footer className="landing-footer">
        <span>CloudChef</span>
        <span>Made for home cooks</span>
      </footer>
    </Page>
  );
}
