const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/user.model');
const Service = require('./src/models/service.model');
const Review = require('./src/models/review.model');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

const mockProviders = [
    {
        name: 'Alex Chen', email: 'alex@example.com', password: 'password123', role: 'provider',
        bio: 'Full-stack developer with 8 years experience.',
        location: { city: 'San Francisco', state: 'CA', country: 'USA', type: 'Point', coordinates: [-122.4194, 37.7749] },
        skillsOffered: ['React', 'Node.js', 'Python'],
        rating: { average: 4.9, count: 127 },
        isActive: true,
    },
    {
        name: 'Sarah Kim', email: 'sarah@example.com', password: 'password123', role: 'provider',
        bio: 'Creative designer specializing in user-centered design.',
        location: { city: 'New York', state: 'NY', country: 'USA', type: 'Point', coordinates: [-74.0060, 40.7128] },
        skillsOffered: ['UI/UX', 'Figma', 'Branding'],
        rating: { average: 4.8, count: 93 },
        isActive: true,
    },
    {
        name: 'Marcus Williams', email: 'marcus@example.com', password: 'password123', role: 'provider',
        bio: 'PhD candidate helping students excel in STEM subjects.',
        location: { city: 'Chicago', state: 'IL', country: 'USA', type: 'Point', coordinates: [-87.6298, 41.8781] },
        skillsOffered: ['Math', 'Physics', 'SAT Prep'],
        rating: { average: 5.0, count: 64 },
        isActive: true,
    },
    {
        name: 'Priya Patel', email: 'priya@example.com', password: 'password123', role: 'provider',
        bio: 'Certified personal trainer with a holistic approach.',
        location: { city: 'Austin', state: 'TX', country: 'USA', type: 'Point', coordinates: [-97.7431, 30.2672] },
        skillsOffered: ['Yoga', 'HIIT', 'Nutrition'],
        rating: { average: 4.7, count: 156 },
        isActive: true,
    },
    {
        name: "James O'Brien", email: 'james@example.com', password: 'password123', role: 'provider',
        bio: 'Professional musician offering lessons for all levels.',
        location: { city: 'Nashville', state: 'TN', country: 'USA', type: 'Point', coordinates: [-86.7816, 36.1627] },
        skillsOffered: ['Guitar', 'Piano', 'Theory'],
        rating: { average: 4.9, count: 48 },
        isActive: true,
    },
    {
        name: 'Maria Santos', email: 'maria@example.com', password: 'password123', role: 'provider',
        bio: 'Native Spanish speaker offering academic language lessons.',
        location: { city: 'Miami', state: 'FL', country: 'USA', type: 'Point', coordinates: [-80.1918, 25.7617] },
        skillsOffered: ['Spanish', 'Portuguese', 'ESL'],
        rating: { average: 4.8, count: 82 },
        isActive: true,
    }
];

const mockServices = [
    { title: 'React Development Session', category: 'technology', description: 'One-on-one personalized session tailored to your needs.', pricing: { amount: 85, currency: 'USD' }, duration: '1 hour', isActive: true },
    { title: 'UI/UX Design Review', category: 'design', description: 'One-on-one personalized session tailored to your needs.', pricing: { amount: 75, currency: 'USD' }, duration: '1 hour', isActive: true },
    { title: 'Math Tutoring', category: 'tutoring', description: 'One-on-one personalized session tailored to your needs.', pricing: { amount: 55, currency: 'USD' }, duration: '1 hour', isActive: true },
    { title: 'Yoga Session', category: 'fitness', description: 'One-on-one personalized session tailored to your needs.', pricing: { amount: 60, currency: 'USD' }, duration: '1 hour', isActive: true },
    { title: 'Guitar Lessons', category: 'other', description: 'One-on-one personalized session tailored to your needs.', pricing: { amount: 70, currency: 'USD' }, duration: '1 hour', isActive: true },
    { title: 'Spanish Lessons', category: 'tutoring', description: 'One-on-one personalized session tailored to your needs.', pricing: { amount: 45, currency: 'USD' }, duration: '1 hour', isActive: true },
];

async function seed() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(MONGO_URI);

        console.log('Clearing old mocked providers...');
        const emails = mockProviders.map(p => p.email);
        const existing = await User.find({ email: { $in: emails } });
        const ids = existing.map(u => u._id);
        await User.deleteMany({ _id: { $in: ids } });
        await Service.deleteMany({ providerId: { $in: ids } });

        console.log('Inserting new providers...');
        for (let i = 0; i < mockProviders.length; i++) {
            let p = mockProviders[i];
            p.password = await bcrypt.hash(p.password, 12);
            const user = await User.create(p);

            let s = mockServices[i];
            s.providerId = user._id;
            await Service.create(s);
            console.log(`Created ${user.name}`);
        }

        console.log('Seed complete!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
