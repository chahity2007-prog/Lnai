// Sample profile used when DEMO_MODE=true, so the resume/CV generation can be
// tried end-to-end without configuring real LinkedIn OAuth credentials.
export const demoProfile = {
  fullName: 'Alex Johnson',
  firstName: 'Alex',
  lastName: 'Johnson',
  email: 'alex.johnson@example.com',
  phone: '+1 (555) 123-4567',
  location: 'San Francisco, CA',
  website: 'alexjohnson.dev',
  linkedin: 'linkedin.com/in/alexjohnson',
  picture: '',
  headline: 'Senior Software Engineer | Cloud & Distributed Systems',
  summary:
    'Senior software engineer with 8+ years building scalable, reliable ' +
    'backend systems. Passionate about clean architecture, developer ' +
    'experience and mentoring. Proven record of leading projects from ' +
    'design to production for millions of users.',
  experience: [
    {
      title: 'Senior Software Engineer',
      company: 'Cloudscale Inc.',
      location: 'San Francisco, CA',
      startDate: 'Jan 2021',
      endDate: 'Present',
      description:
        'Lead a team of 5 building the core billing platform.\n' +
        'Reduced API latency by 40% by redesigning the caching layer.\n' +
        'Drove adoption of infrastructure-as-code across the org.',
    },
    {
      title: 'Software Engineer',
      company: 'DataWorks',
      location: 'Austin, TX',
      startDate: 'Jun 2017',
      endDate: 'Dec 2020',
      description:
        'Built real-time data pipelines processing 2B+ events/day.\n' +
        'Owned the migration from monolith to microservices.\n' +
        'Mentored 3 junior engineers.',
    },
  ],
  education: [
    {
      degree: 'B.S. in Computer Science',
      school: 'University of Texas at Austin',
      location: 'Austin, TX',
      startDate: '2013',
      endDate: '2017',
      description: 'GPA 3.8/4.0. Dean\'s List. ACM chapter president.',
    },
  ],
  skills: [
    'JavaScript',
    'TypeScript',
    'Node.js',
    'Go',
    'PostgreSQL',
    'AWS',
    'Kubernetes',
    'Distributed Systems',
    'System Design',
    'Team Leadership',
  ],
  certifications: [
    { name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', year: '2022' },
  ],
  languages: [
    { name: 'English', level: 'Native' },
    { name: 'Spanish', level: 'Professional' },
  ],
};
