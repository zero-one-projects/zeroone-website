import alKhalidPalahuddinImage from '../assets/team/al-khalid-palahuddin.png';
import alrizaPalahuddinImage from '../assets/team/alriza-palahuddin.png';
import paulJohnPeligroImage from '../assets/team/paul-john-peligro.png';

export const companyProfile = {
  brand: {
    eyebrow: 'ZeroOne | IT Solutions',
    name: 'ZeroOne IT Solutions'
  },
  hero: {
    title: 'From Idea to Deployment',
    paragraphs: [
      'ZeroOne IT Solutions builds intelligent digital experiences that drive business growth.',
      'From web and mobile applications to AI-powered platforms, we deliver reliable, scalable solutions engineered for long-term success.'
    ],
    primaryAction: {
      label: "Let's Talk",
      href: '#contact'
    },
    secondaryAction: {
      label: 'Learn More',
      href: '#about'
    }
  },
  stats: [
    { label: 'Core Expertise', value: 'Web + Mobile + AI' },
    { label: 'Delivery Approach', value: 'Idea to Deployment' },
    { label: 'Engineering Focus', value: 'Reliable and Scalable' }
  ],
  sections: [
    {
      id: 'about',
      title: 'About Us',
      paragraphs: [
        'ZeroOne IT Solutions is a digital product development company specializing in web, mobile, and AI-powered solutions. We help businesses transform ideas into high-performance digital products that are reliable, scalable, and built for growth.',
        'Our team combines strategic thinking, modern technologies, and user-focused design to deliver solutions that solve real business challenges. From concept to deployment, we ensure every product is engineered with precision, clarity, and long-term success in mind.',
        "Let's build something impactful together."
      ]
    },
    {
      id: 'services',
      title: 'Services',
      variant: 'swipe',
      intro:
        'We build practical digital solutions for businesses, schools, retail operations, and enterprise teams, from internal systems to customer-facing platforms.',
      cards: [
        {
          title: 'Custom Web Application Development',
          description: 'Responsive portals, dashboards, and business platforms built to scale.'
        },
        {
          title: 'Mobile App Development',
          description: 'Mobile apps for operations, customer services, and digital products.'
        },
        {
          title: 'Desktop Application Development',
          description: 'Desktop systems for schools, offices, and specialized workflows.'
        },
        {
          title: 'POS and Inventory Systems',
          description: 'POS, inventory, branch operations, and sales reporting solutions.'
        },
        {
          title: 'Management Information Systems',
          description: 'MIS, HR, enrollment, warehouse, and internal monitoring systems.'
        },
        {
          title: 'AI and Automation Solutions',
          description: 'AI features, automation, transcription, and smart workflow enhancements.'
        }
      ]
    },
    {
      id: 'team',
      title: 'Team',
      intro:
        'Meet the people currently leading ZeroOne IT Solutions across engineering, delivery, and digital product execution.',
      members: [
        {
          name: 'Paul John D. Peligro',
          role: 'Senior Application Systems Engineer / Full-Stack Consultant',
          image: paulJohnPeligroImage,
          cvLabel: 'Request CV',
          cvHref: 'mailto:contact@zeroone-apps.com?subject=Request%20CV%20-%20Paul%20John%20D.%20Peligro'
        },
        {
          name: 'Alriza Muksan Palahuddin',
          role: 'IT Support Engineer / Software Engineer',
          image: alrizaPalahuddinImage,
          cvLabel: 'Request CV',
          cvHref: 'mailto:contact@zeroone-apps.com?subject=Request%20CV%20-%20Alriza%20Muksan%20Palahuddin'
        },
        {
          name: 'Al Khalid Muksan Palahuddin',
          role: 'Computer Engineer',
          image: alKhalidPalahuddinImage,
          cvLabel: 'Request CV',
          cvHref: 'mailto:contact@zeroone-apps.com?subject=Request%20CV%20-%20Al%20Khalid%20Muksan%20Palahuddin'
        }
      ]
    }
  ],
  contact: {
    id: 'contact',
    title: 'Contact',
    description: 'Get in Touch With Us',
    email: 'contact@zeroone-apps.com'
  }
};
