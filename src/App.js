

import './fonts.css';
import './App.css';

import Hero from './sections/Hero';
import About from './sections/About';
import Projects from './sections/Projects';
import Team from './sections/Team';
import ThemeToggle from './components/ThemeToggle';


function App() {
  return (
    <div className="App">
      <ThemeToggle />
      <Hero />
      <About />
      <Projects />
      <Team />
      <footer className="footer">
        <p>© 2025 Zero One Systems Services. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
