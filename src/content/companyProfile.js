import alKhalidPalahuddinImage from '../assets/team/Khalid.jpg';
import alrizaPalahuddinImage from '../assets/team/riza.jpeg';
import paulJohnPeligroImage from '../assets/team/pj.png';

export const companyProfile = {
  brand: {
    eyebrow: 'ZeroOne | Information Technology Inc.',
    name: 'ZeroOne IT Inc.'
  },
  hero: {
    title: {
      prefix: 'From Idea to ',
      highlight: 'Deployment'
    },
    paragraphs: [
      'ZeroOne IT Inc. builds intelligent digital experiences that drive business growth.',
      'From web and mobile applications to AI-powered platforms, we deliver reliable, scalable solutions engineered for long-term success.'
    ],
    primaryAction: {
      label: "Let's Talk",
      href: '#contact'
    },
    secondaryAction: {
      label: 'Learn More',
      href: '#about-us'
    }
  },
  stats: [
    { label: 'Core Expertise', value: 'Web + Mobile + AI', icon: 'code' },
    { label: 'Delivery Approach', value: 'Idea to Deployment', icon: 'rocket' },
    { label: 'Engineering Focus', value: 'Reliable and Scalable', icon: 'shield' }
  ],
  projectCounters: [
    { label: 'Ongoing Projects', value: '08', icon: 'pulse' },
    { label: 'Completed Projects', value: '52', icon: 'check' },
    { label: 'Referred Clients', value: '29', icon: 'users' },
    { label: 'Years of Expertise', value: '13', icon: 'award' }
  ],
  sections: [
    {
      id: 'about',
      type: 'text',
      title: 'About Us',
      paragraphs: [
        'ZeroOne IT Inc. is a digital product development company specializing in web, mobile, and AI-powered solutions. We help businesses transform ideas into high-performance digital products that are reliable, scalable, and built for growth.',
        'Our team combines strategic thinking, modern technologies, and user-focused design to deliver solutions that solve real business challenges. From concept to deployment, we ensure every product is engineered with precision, clarity, and long-term success in mind.',
        "Let's build something impactful together."
      ],
      highlightStatement: {
        lead: 'Struggling with outdated systems and manual processes?',
        lines: [
          [
            { text: 'We ', tone: 'base' },
            { text: 'design', tone: 'violet' },
            { text: ' and ', tone: 'base' },
            { text: 'build', tone: 'blue' }
          ],
          [{ text: 'software solutions that', tone: 'base' }],
          [
            { text: 'simplify', tone: 'blue' },
            { text: ' processes and', tone: 'base' }
          ],
          [{ text: 'drive results.', tone: 'violet' }]
        ],
        problemSection: {
          eyebrow: 'Common Challenges',
          title: 'Operational bottlenecks should not hold your business back.',
          intro:
            'Many growing businesses lose time, visibility, and momentum because critical workflows still depend on disconnected tools and manual work.',
          items: [
            'Manual tracking of sales, inventory, and daily operations',
            'Slow, error-prone processes that create unnecessary delays',
            'Limited real-time reporting and decision-making visibility',
            'Disconnected systems across branches, teams, or departments',
            'Operational setups that become harder to scale over time',
            'Too little automation to support consistent growth'
          ],
          emotionalLine:
            "If these challenges sound familiar, you're not alone. They affect productivity, customer experience, and long-term growth.",
          transition:
            'We help businesses move from manual operations to streamlined, scalable digital systems built for clarity, efficiency, and growth.',
          solutionSection: {
            eyebrow: 'How We Work',
            title: 'A practical process built around your business.',
            intro:
              'We do not force businesses into generic tools. We study how your operations work, identify what slows them down, and build solutions that fit your real workflow.',
            steps: [
              {
                title: 'Discover',
                description:
                  'We learn about your current process, bottlenecks, goals, and the day-to-day challenges your team faces.'
              },
              {
                title: 'Plan',
                description:
                  'We define the right solution, map the workflow, and recommend features that bring the most value first.'
              },
              {
                title: 'Build',
                description:
                  'We design and develop a reliable system tailored to your operations, whether for web, mobile, desktop, or internal business use.'
              },
              {
                title: 'Improve',
                description:
                  'We refine, support, and scale the solution so it continues to perform as your business grows.'
              }
            ]
          }
        }
      }
    },
    {
      id: 'vision',
      type: 'text',
      title: 'The Future We’re Creating',
      paragraphs: [
        'To be a trusted technology partner that delivers practical, innovative, and scalable digital solutions, helping organizations thrive in an increasingly digital world.'
      ]
    },
    {
      id: 'mission',
      type: 'text',
      title: 'Our Approach',
      paragraphs: [
        'Our mission is to design and build reliable software solutions that solve real business challenges. With over 13 years of experience, ZeroOne IT Inc. works closely with clients to deliver custom web, mobile, and enterprise systems that improve efficiency, add value, and support long-term growth.'
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
        'Meet the people currently leading ZeroOne IT Inc. across engineering, delivery, and digital product execution.',
      members: [
        {
          name: 'PJ',
          role: 'Chief Executive Officer (CEO)\nSenior Lead Software Developer & IT Consultant',
          image: paulJohnPeligroImage
        },
        {
          name: 'Riza',
          role: 'Account Manager\nDesktop Engineer & Software Developer',
          image: alrizaPalahuddinImage
        },
        {
          name: 'AL',
          role: 'Business Development Officer (BDO)\nMid-Level Software Developer',
          image: alKhalidPalahuddinImage
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
