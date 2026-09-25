const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');

const seedData = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@gallery.com' });
    let adminUser = adminExists;

    if (!adminUser) {
      adminUser = await User.create({
        fullName: 'Admin Director',
        email: 'admin@gallery.com',
        password: 'Admin@12345',
        role: 'ADMIN',
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        phoneNumber: '+1-555-0199'
      });
      console.log('[Seed] Created default Admin: admin@gallery.com / Admin@12345');
    }

    const userExists = await User.findOne({ email: 'laasya@gallery.com' });
    let regularUser = userExists;

    if (!regularUser) {
      regularUser = await User.create({
        fullName: 'Laasya Sharma',
        email: 'laasya@gallery.com',
        password: 'User@12345',
        role: 'USER',
        profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
        phoneNumber: '+1-555-0142'
      });
      console.log('[Seed] Created demo User: laasya@gallery.com / User@12345');
    }

    const postCount = await Post.countDocuments();
    if (postCount === 0) {
      const samplePosts = [
        {
          title: 'Annual College Cultural Fest 2026',
          description:
            'Students and faculty actively participated in cultural activities, musical performances, classical dance competitions, and theatrical drama during the annual college cultural festival. Over 1,200 attendees witnessed the vibrant showcase of heritage and student creativity.',
          uploadedBy: regularUser._id,
          status: 'APPROVED',
          photos: [
            {
              publicId: 'seed/cultural_fest_1',
              url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
              originalName: 'Cultural_Celebration_Stage.jpg',
              format: 'jpg',
              width: 1200,
              height: 800
            },
            {
              publicId: 'seed/cultural_fest_2',
              url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80',
              originalName: 'Audience_Gathering.jpg',
              format: 'jpg',
              width: 1200,
              height: 800
            },
            {
              publicId: 'seed/cultural_fest_3',
              url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&auto=format&fit=crop&q=80',
              originalName: 'Live_Band_Performance.jpg',
              format: 'jpg',
              width: 1200,
              height: 800
            }
          ]
        },
        {
          title: 'National Science & Robotics Expo 2026',
          description:
            'Engineering and physics scholars unveiled autonomous rovers, clean energy prototypes, AI-guided agricultural drones, and bionic prosthetics at the state convention center.',
          uploadedBy: regularUser._id,
          status: 'APPROVED',
          photos: [
            {
              publicId: 'seed/robotics_expo_1',
              url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80',
              originalName: 'Robotic_Arm_Demo.jpg',
              format: 'jpg',
              width: 1200,
              height: 800
            },
            {
              publicId: 'seed/robotics_expo_2',
              url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
              originalName: 'Microcontroller_Testing.jpg',
              format: 'jpg',
              width: 1200,
              height: 800
            }
          ]
        },
        {
          title: 'Himalayan Photography Expedition & Wildlife Documentation',
          description:
            'High-altitude alpine flora, glaciated mountain passes, and elusive Himalayan wildlife captured during a 10-day documentary trek through Ladakh and Spiti valleys.',
          uploadedBy: regularUser._id,
          status: 'APPROVED',
          photos: [
            {
              publicId: 'seed/himalaya_1',
              url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
              originalName: 'Alpine_Valley_Dawn.jpg',
              format: 'jpg',
              width: 1200,
              height: 800
            },
            {
              publicId: 'seed/himalaya_2',
              url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80',
              originalName: 'Glacial_Peak.jpg',
              format: 'jpg',
              width: 1200,
              height: 800
            },
            {
              publicId: 'seed/himalaya_3',
              url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&auto=format&fit=crop&q=80',
              originalName: 'Valley_Meadow.jpg',
              format: 'jpg',
              width: 1200,
              height: 800
            }
          ]
        },
        {
          title: 'Community Environmental Green Plantation Drive',
          description:
            'Over 500 indigenous saplings planted along the urban riverfront corridor by enthusiastic neighborhood volunteers, school environmental clubs, and civic leaders.',
          uploadedBy: regularUser._id,
          status: 'PENDING',
          photos: [
            {
              publicId: 'seed/tree_plantation_1',
              url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&auto=format&fit=crop&q=80',
              originalName: 'Volunteers_Planting.jpg',
              format: 'jpg',
              width: 1200,
              height: 800
            }
          ]
        }
      ];

      await Post.create(samplePosts);
      console.log('[Seed] Populated initial demo posts with approved and pending status.');
    }
  } catch (error) {
    console.error('[Seed Error]', error);
  }
};

module.exports = seedData;
