require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Post = require("../models/Post");
const Opportunity = require("../models/Opportunity");

const seed = async () => {
  await connectDB();

  const adminEmail = "admin@bridgeaz.com";
  const adminPassword = "Admin123!";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await User.findOneAndUpdate(
    { email: adminEmail },
    {
      name: "BridgeAZ Admin",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      userType: "professional",
      currentRegion: "Global",
      headline: "BridgeAZ administrator",
      bio: "Managing the BridgeAZ community.",
      isAdmin: true,
      banned: false,
      mentorVerified: true,
      isMentor: true
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const existingUserCount = await User.countDocuments();
  if (existingUserCount <= 1) {
    const passwordHash = await bcrypt.hash("password123", 10);
    const users = await User.insertMany([
      {
        name: "Rashad Mammadov",
        email: "rashad@student.com",
        passwordHash,
        userType: "student",
        currentRegion: "Istanbul, Turkey",
        headline: "CS Masters at ITU",
        bio: "Exploring AI and looking for mentors in product and ML.",
        studentVerified: true,
        verificationStatus: "verified",
        skills: ["Python", "ML", "Data Science"]
      },
      {
        name: "Leyla Aliyeva",
        email: "leyla@student.com",
        passwordHash,
        userType: "student",
        currentRegion: "Boston, USA",
        headline: "Undergrad in Business Analytics",
        bio: "Interested in fintech and diaspora entrepreneurship.",
        skills: ["Excel", "SQL", "Product"]
      },
      {
        name: "Farid Hasanov",
        email: "farid@mentor.com",
        passwordHash,
        userType: "professional",
        currentRegion: "San Francisco, USA",
        headline: "Senior Software Engineer",
        bio: "I mentor students breaking into tech.",
        isMentor: true,
        mentorVerified: true
      },
      {
        name: "Nigar Quliyeva",
        email: "nigar@mentor.com",
        passwordHash,
        userType: "professional",
        currentRegion: "Baku, Azerbaijan",
        headline: "Founder at Baku Studio",
        bio: "Building creative communities in Baku.",
        isMentor: true
      }
    ]);

    const [studentTR, studentUS, mentorUS, mentorAZ] = users;

    const postCount = await Post.countDocuments();
    if (postCount === 0) {
      await Post.insertMany([
        {
          author: studentTR._id,
          content: "Anyone in Istanbul working on AI research? Looking to connect!",
          visibilityRegion: "Istanbul"
        },
        {
          author: mentorUS._id,
          content: "Hosting a virtual resume review for Azerbaijani students next week.",
          visibilityRegion: "ALL"
        },
        {
          author: studentUS._id,
          content: "Just started a fintech capstone. Would love mentors with fintech experience.",
          visibilityRegion: "North America"
        },
        {
          author: mentorAZ._id,
          content: "Baku meetup this Friday for creatives and founders!",
          visibilityRegion: "Baku"
        }
      ]);
    }

    const opportunityCount = await Opportunity.countDocuments();
    if (opportunityCount === 0) {
      await Opportunity.insertMany([
        {
          postedBy: admin._id,
          title: "Community Partnerships Intern",
          orgName: "BridgeAZ",
          type: "Internship",
          locationMode: "Remote",
          country: "Global",
          description:
            "Support community outreach and student engagement. Light research, scheduling, and storytelling.",
          requirements: ["Strong writing", "Comfort with async coordination"],
          visibilityRegion: "ALL",
          tags: ["community", "outreach", "part-time"]
        },
        {
          postedBy: mentorAZ._id,
          title: "Creative Producer",
          orgName: "Baku Studio",
          type: "Contract",
          locationMode: "On-site",
          country: "Azerbaijan",
          city: "Baku",
          description:
            "Short-term contract to help coordinate local workshops and small events.",
          requirements: ["Event coordination", "Fluent Azerbaijani"],
          visibilityRegion: "Baku",
          tags: ["events", "creative"]
        },
        {
          postedBy: mentorUS._id,
          title: "Research Assistant (NLP)",
          orgName: "Diaspora Lab",
          type: "Research",
          locationMode: "Hybrid",
          country: "USA",
          city: "Boston",
          description:
            "Assist with data cleaning and literature review for applied NLP projects.",
          requirements: ["Python", "Basic ML familiarity"],
          visibilityRegion: "North America",
          tags: ["research", "nlp", "python"]
        },
        {
          postedBy: mentorUS._id,
          title: "Product Analyst",
          orgName: "Bridgefin",
          type: "Full-time",
          locationMode: "Remote",
          country: "Remote",
          description:
            "Work with a small fintech team to map user journeys and define metrics.",
          requirements: ["SQL", "Spreadsheet fluency"],
          visibilityRegion: "ALL",
          tags: ["product", "fintech"]
        },
        {
          postedBy: admin._id,
          title: "Youth Program Coordinator",
          orgName: "Ankara Impact",
          type: "Part-time",
          locationMode: "Hybrid",
          country: "Turkey",
          city: "Ankara",
          description:
            "Coordinate weekly sessions for student cohorts and track progress notes.",
          requirements: ["Program coordination", "Turkish language"],
          visibilityRegion: "Ankara",
          tags: ["education", "community"]
        },
        {
          postedBy: mentorAZ._id,
          title: "Data Volunteer",
          orgName: "Open Baku",
          type: "Volunteer",
          locationMode: "Remote",
          country: "Azerbaijan",
          description:
            "Help clean public datasets and publish summaries for local civic groups.",
          requirements: ["Attention to detail"],
          visibilityRegion: "Baku",
          status: "closed",
          tags: ["civic", "data"]
        }
      ]);
    }
  }

  console.log(`Seed complete. Admin login: ${adminEmail} / ${adminPassword}`);
  process.exit(0);
};

seed().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
