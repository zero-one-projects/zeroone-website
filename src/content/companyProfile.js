import alKhalidPalahuddinImage from '../assets/team/al-khalid-palahuddin.png';
import alrizaPalahuddinImage from '../assets/team/alriza-palahuddin.png';
import paulJohnPeligroImage from '../assets/team/paul-john-peligro.png';

export const companyProfile = {
  brand: {
    eyebrow: 'ZeroOne | IT Solutions',
    name: 'ZeroOne IT Solutions'
  },
  hero: {
    title: {
      prefix: 'From Idea to ',
      highlight: 'Deployment'
    },
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
    { label: 'Core Expertise', value: 'Web + Mobile + AI', icon: 'code' },
    { label: 'Delivery Approach', value: 'Idea to Deployment', icon: 'rocket' },
    { label: 'Engineering Focus', value: 'Reliable and Scalable', icon: 'shield' }
  ],
  projectCounters: [
    { label: 'Ongoing Projects', value: '07', icon: 'pulse' },
    { label: 'Completed Projects', value: '52', icon: 'check' },
    { label: 'Referred Clients', value: '28', icon: 'users' }
  ],
  sections: [
    {
      id: 'about',
      type: 'text',
      title: 'About Us',
      paragraphs: [
        'ZeroOne IT Solutions is a digital product development company specializing in web, mobile, and AI-powered solutions. We help businesses transform ideas into high-performance digital products that are reliable, scalable, and built for growth.',
        'Our team combines strategic thinking, modern technologies, and user-focused design to deliver solutions that solve real business challenges. From concept to deployment, we ensure every product is engineered with precision, clarity, and long-term success in mind.',
        "Let's build something impactful together."
      ]
    },
    {
      id: 'services',
      type: 'cards',
      title: 'Services',
      variant: 'swipe',
      intro:
        'We build practical digital solutions for businesses, schools, retail operations, and enterprise teams, from internal systems to customer-facing platforms.',
      outro: '...and other custom software solutions tailored to your business needs.',
      cards: [
        {
          title: 'Custom Web Application Development',
          description: 'Responsive portals, dashboards, and scalable business platforms tailored to your needs.'
        },
        {
          title: 'Mobile App Development',
          description: 'Mobile applications for business operations, customer engagement, and digital products.'
        },
        {
          title: 'Desktop Application Development',
          description:
            'We build desktop applications tailored for schools, offices, and specialized operational workflows.'
        },
        {
          title: 'POS & Inventory Systems',
          description:
            '(Flexible plans: Subscription or One-Time Payment)\nIntegrated POS and inventory solutions designed to manage sales, branches, and business reporting efficiently.'
        },
        {
          title: 'E-Commerce & Retail Solutions',
          description:
            'Integrated systems for online stores and physical retail operations, including sales, inventory, and order management.'
        },
        {
          title: 'Booking & Reservation Systems',
          description:
            'Custom booking and reservation platforms for hotels, services, and appointment-based businesses.'
        },
        {
          title: 'Hotel Management Systems',
          description:
            'End-to-end hotel management solutions covering reservations, front desk operations, billing, and reporting.'
        },
        {
          title: 'Payroll Systems',
          description:
            'Automated payroll solutions for salary computation, deductions, payslips, and employee records.'
        },
        {
          title: 'Management Information Systems (MIS)',
          description:
            'Integrated MIS solutions for HR, enrollment, warehouse operations, and internal monitoring.'
        },
        {
          title: 'Custom ERP Systems',
          description:
            'Fully integrated ERP solutions designed to unify finance, operations, HR, inventory, and reporting in one system.'
        },
        {
          title: 'Company Profile & Digital Presence Solutions',
          description:
            'Custom digital company profiles, web-based presentations, and business profile systems.'
        },
        {
          title: 'AI and Automation Solutions',
          description:
            'AI-powered features, automation, transcription, and intelligent workflow enhancements.'
        }
      ]
    },
    {
      id: 'team',
      type: 'team',
      title: 'Team',
      intro:
        'Meet the people currently leading ZeroOne IT Solutions across engineering, delivery, and digital product execution.',
      members: [
        {
          name: 'PJ',
          role: 'Senior Application Systems Engineer / Full-Stack Consultant',
          image: paulJohnPeligroImage,
          cvLabel: 'Request CV',
          cvHref: 'mailto:contact@zeroone-apps.com?subject=Request%20CV%20-%20Paul%20John%20D.%20Peligro'
        },
        {
          name: 'Riza',
          role: 'IT Support Engineer / Software Engineer',
          image: alrizaPalahuddinImage,
          cvLabel: 'Request CV',
          cvHref: 'mailto:contact@zeroone-apps.com?subject=Request%20CV%20-%20Alriza%20Muksan%20Palahuddin'
        },
        {
          name: 'Khalid',
          role: 'Junior Software Engineer',
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
