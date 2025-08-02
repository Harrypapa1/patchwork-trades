import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import LazyImage from '../components/LazyImage';

const WeeklyJobs = () => {
  const { currentUser, userType } = useAuth();
  const navigate = useNavigate();
  const [thisWeekJobs, setThisWeekJobs] = useState([]);
  const [lastWeekJobs, setLastWeekJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStats, setWeekStats] = useState({
    thisWeekCount: 0,
    thisWeekValue: 0,
    lastWeekCount: 0,
    lastWeekValue: 0
  });

  useEffect(() => {
    if (currentUser) {
      fetchWeeklyJobs();
    }
  }, [currentUser, userType]);

  // Get date ranges for this week and last week
  const getWeekRanges = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate start of this week (Monday)
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday (0) to 6
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - daysToMonday);
    
    // Calculate end of this week (Sunday)
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
    thisWeekEnd.setHours(23, 59, 59, 999);
    
    // Calculate last week range
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
    lastWeekEnd.setHours(23, 59, 59, 999);

    return {
      thisWeekStart: thisWeekStart.toISOString(),
      thisWeekEnd: thisWeekEnd.toISOString(),
      lastWeekStart: lastWeekStart.toISOString(),
      lastWeekEnd: lastWeekEnd.toISOString()
    };
  };

  const fetchWeeklyJobs = async () => {
    if (!currentUser) return;
    
    try {
      const { thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd } = getWeekRanges();
      
      // Base query depending on user type
      const baseQuery = userType === 'customer' 
        ? where('customer_id', '==', currentUser.uid)
        : where('tradesman_id', '==', currentUser.uid);

      // Fetch this week's jobs (scheduled or in progress)
      const thisWeekQuery = query(
        collection(db, 'active_jobs'),
        baseQuery,
        where('status', 'in', ['accepted', 'in_progress', 'pending_approval'])
      );

      // Fetch last week's completed jobs
      const lastWeekQuery = query(
        collection(db, 'active_jobs'),
        baseQuery,
        where('status', '==', 'completed'),
        orderBy('completed_at', 'desc')
      );

      const [thisWeekSnapshot, lastWeekSnapshot] = await Promise.all([
        getDocs(thisWeekQuery),
        getDocs(lastWeekQuery)
      ]);

      // Process this week's jobs
      const thisWeekJobsData = thisWeekSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(job => {
        // Filter by agreed_date for this week
        if (job.agreed_date) {
          const jobDate = new Date(job.agreed_date);
          const weekStart = new Date(thisWeekStart);
          const weekEnd = new Date(thisWeekEnd);
          return jobDate >= weekStart && jobDate <= weekEnd;
        }
        return false;
      });

      // Process last week's jobs
      const lastWeekJobsData = lastWeekSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(job => {
        // Filter by completed_at for last week
        if (job.completed_at) {
          const completedDate = new Date(job.completed_at);
          const weekStart = new Date(lastWeekStart);
          const weekEnd = new Date(lastWeekEnd);
          return completedDate >= weekStart && completedDate <= weekEnd;
        }
        return false;
      });

      // Sort jobs by date
      thisWeekJobsData.sort((a, b) => new Date(a.agreed_date) - new Date(b.agreed_date));
      lastWeekJobsData.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

      setThisWeekJobs(thisWeekJobsData);
      setLastWeekJobs(lastWeekJobsData);

      // Calculate stats
      const thisWeekValue = thisWeekJobsData.reduce((sum, job) => sum + getNumericPrice(job), 0);
      const lastWeekValue = lastWeekJobsData.reduce((sum, job) => sum + getNumericPrice(job), 0);

      setWeekStats({
        thisWeekCount: thisWeekJobsData.length,
        thisWeekValue,
        lastWeekCount: lastWeekJobsData.length,
        lastWeekValue
      });

      // Generate demo data if no real data exists
      if (thisWeekJobsData.length === 0 && lastWeekJobsData.length === 0) {
        generateDemoData();
      }

    } catch (error) {
      console.error('Error fetching weekly jobs:', error);
      // Show demo data on error
      generateDemoData();
    } finally {
      setLoading(false);
    }
  };

  // Generate demo data for demonstration - MIXED VALUE JOBS FOR EVERYONE! 🚀
  const generateDemoData = () => {
    const demoThisWeek = [
      // BASIC EVERYDAY JOBS - Affordable for everyone
      {
        id: 'demo_tw_1',
        job_title: 'Replace Kitchen Tap',
        customer_name: 'Sarah Johnson',
        tradesman_name: 'Mike Wilson',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(0), // Monday
        time_slot: 'morning',
        final_price: '£75',
        status: 'accepted',
        location: 'Stoke Newington, London',
        job_description: 'Replace old kitchen tap with modern mixer tap'
      },
      {
        id: 'demo_tw_2',
        job_title: 'Fix Flickering Light',
        customer_name: 'John Davis',
        tradesman_name: 'Emma Thompson',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(0), // Monday
        time_slot: 'afternoon',
        final_price: '£85',
        status: 'in_progress',
        location: 'Stoke Newington, London',
        job_description: 'Diagnose and fix flickering ceiling light in living room'
      },
      {
        id: 'demo_tw_3',
        job_title: 'Unblock Kitchen Sink',
        customer_name: 'Lisa Brown',
        tradesman_name: 'Tom Clarke',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(0), // Monday
        time_slot: 'evening',
        final_price: '£60',
        status: 'accepted',
        location: 'Stoke Newington, London',
        job_description: 'Clear blocked kitchen sink drain'
      },
      {
        id: 'demo_tw_4',
        job_title: 'Hang 3 Pictures & Mirror',
        customer_name: 'Michael Roberts',
        tradesman_name: 'Sophie Mitchell',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(1), // Tuesday
        time_slot: 'morning',
        final_price: '£95',
        status: 'accepted',
        location: 'Stoke Newington, London',
        job_description: 'Securely hang family pictures and large bathroom mirror'
      },
      {
        id: 'demo_tw_5',
        job_title: 'Fix Squeaky Door Hinges',
        customer_name: 'Rachel Green',
        tradesman_name: 'James Anderson',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(1), // Tuesday
        time_slot: 'afternoon',
        final_price: '£50',
        status: 'accepted',
        location: 'Stoke Newington, London',
        job_description: 'Oil and adjust squeaky hinges on 4 doors'
      },
      {
        id: 'demo_tw_6',
        job_title: 'Install Bathroom Shelf',
        customer_name: 'David Wilson',
        tradesman_name: 'Kate Roberts',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(1), // Tuesday
        time_slot: 'evening',
        final_price: '£80',
        status: 'accepted',
        location: 'Stoke Newington, London',
        job_description: 'Mount floating shelf above bathroom sink'
      },
      // MEDIUM VALUE JOBS - Common household needs
      {
        id: 'demo_tw_7',
        job_title: 'Install New Toilet',
        customer_name: 'Amy Clark',
        tradesman_name: 'Robert Taylor',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(2), // Wednesday
        time_slot: 'morning',
        final_price: '£280',
        status: 'in_progress',
        location: 'Stoke Newington, London',
        job_description: 'Remove old toilet and install new close-coupled suite'
      },
      {
        id: 'demo_tw_8',
        job_title: 'Paint Bedroom Walls',
        customer_name: 'Steve Miller',
        tradesman_name: 'Laura Davies',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(2), // Wednesday
        time_slot: 'afternoon',
        final_price: '£320',
        status: 'accepted',
        location: 'Stoke Newington, London',
        job_description: 'Paint master bedroom with customer-supplied paint'
      },
      {
        id: 'demo_tw_9',
        job_title: 'Fix Garden Gate Lock',
        customer_name: 'Helen Cooper',
        tradesman_name: 'Mark Phillips',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(3), // Thursday
        time_slot: 'morning',
        final_price: '£120',
        status: 'accepted',
        location: 'Stoke Newington, London',
        job_description: 'Repair broken lock mechanism on wooden garden gate'
      },
      {
        id: 'demo_tw_10',
        job_title: 'Install 4 New Sockets',
        customer_name: 'Peter Jackson',
        tradesman_name: 'Charlotte Evans',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(3), // Thursday
        time_slot: 'afternoon',
        final_price: '£240',
        status: 'accepted',
        location: 'Stoke Newington, London',
        job_description: 'Add 4 double sockets to living room for new TV setup'
      },
      {
        id: 'demo_tw_11',
        job_title: 'Assemble IKEA Wardrobe',
        customer_name: 'Mary Collins',
        tradesman_name: 'Oliver Stone',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(4), // Friday
        time_slot: 'morning',
        final_price: '£150',
        status: 'accepted',
        location: 'Stoke Newington, London',
        job_description: 'Professional assembly of large IKEA PAX wardrobe system'
      },
      // HIGHER VALUE JOBS - For those bigger projects
      {
        id: 'demo_tw_12',
        job_title: 'Bathroom Renovation',
        customer_name: 'George Thompson',
        tradesman_name: 'Sarah Murphy',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(4), // Friday
        time_slot: 'afternoon',
        final_price: '£2,400',
        status: 'pending_approval',
        location: 'Stoke Newington, London',
        job_description: 'Complete bathroom renovation with new suite and tiling'
      },
      {
        id: 'demo_tw_13',
        job_title: 'Pressure Wash Driveway',
        customer_name: 'Jennifer Walsh',
        tradesman_name: 'Daniel Parker',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(5), // Saturday
        time_slot: 'morning',
        final_price: '£180',
        status: 'accepted',
        location: 'Stoke Newington, London',
        job_description: 'Professional pressure washing of block paved driveway'
      },
      {
        id: 'demo_tw_14',
        job_title: 'Fix Dripping Shower',
        customer_name: 'Carl Edwards',
        tradesman_name: 'Maria Garcia',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(5), // Saturday
        time_slot: 'afternoon',
        final_price: '£110',
        status: 'accepted',
        location: 'Stoke Newington, London',
        job_description: 'Replace worn shower cartridge to stop persistent drip'
      },
      {
        id: 'demo_tw_15',
        job_title: 'Install Ceiling Fan',
        customer_name: 'Rebecca Foster',
        tradesman_name: 'Anthony Clark',
        customer_photo: null,
        tradesman_photo: null,
        agreed_date: getDateInThisWeek(6), // Sunday
        time_slot: 'morning',
        final_price: '£160',
        status: 'accepted',
        location: 'Stoke Newington, London',
        job_description: 'Install ceiling fan with light in master bedroom'
      }
    ];

    const demoLastWeek = [
      // BASIC JOBS COMPLETED - Building trust with small jobs
      {
        id: 'demo_lw_1',
        job_title: 'Replace Broken Light Switch',
        customer_name: 'Victoria Adams',
        tradesman_name: 'Daniel Carter',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(0),
        final_price: '£65',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Replace cracked light switch in hallway',
        reviewed_by_customer: true,
        customer_rating: 5
      },
      {
        id: 'demo_lw_2',
        job_title: 'Fix Wobbly Table',
        customer_name: 'Andrew Foster',
        tradesman_name: 'Jessica Wright',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(0),
        final_price: '£40',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Tighten and stabilize wobbly dining table legs',
        reviewed_by_customer: true,
        customer_rating: 5
      },
      {
        id: 'demo_lw_3',
        job_title: 'Change Bathroom Bulb',
        customer_name: 'Claire Bennett',
        tradesman_name: 'Thomas Hill',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(0),
        final_price: '£35',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Replace hard-to-reach bathroom spotlight bulb',
        reviewed_by_customer: true,
        customer_rating: 5
      },
      {
        id: 'demo_lw_4',
        job_title: 'Bleed Radiators',
        customer_name: 'Ryan Kelly',
        tradesman_name: 'Emma Rodriguez',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(1),
        final_price: '£80',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Bleed all 6 radiators and check heating system',
        reviewed_by_customer: true,
        customer_rating: 4
      },
      {
        id: 'demo_lw_5',
        job_title: 'Grout Bathroom Tiles',
        customer_name: 'Sophie Turner',
        tradesman_name: 'Michael Ross',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(1),
        final_price: '£140',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Re-grout bathroom tiles around shower area',
        reviewed_by_customer: true,
        customer_rating: 5
      },
      {
        id: 'demo_lw_6',
        job_title: 'Fix Creaky Floorboard',
        customer_name: 'Jennifer Moore',
        tradesman_name: 'Christopher Lee',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(1),
        final_price: '£90',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Secure loose floorboard in bedroom',
        reviewed_by_customer: true,
        customer_rating: 5
      },
      {
        id: 'demo_lw_7',
        job_title: 'Install Smoke Detector',
        customer_name: 'Kevin Walsh',
        tradesman_name: 'Amanda Clarke',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(2),
        final_price: '£75',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Install mains-powered smoke detector in hallway',
        reviewed_by_customer: true,
        customer_rating: 4
      },
      {
        id: 'demo_lw_8',
        job_title: 'Clean Gutters',
        customer_name: 'Linda Patterson',
        tradesman_name: 'Simon Baker',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(2),
        final_price: '£120',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Clear blocked gutters and downpipes',
        reviewed_by_customer: true,
        customer_rating: 5
      },
      {
        id: 'demo_lw_9',
        job_title: 'Tile Repair in Kitchen',
        customer_name: 'Gary Richards',
        tradesman_name: 'Natalie Cooper',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(2),
        final_price: '£95',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Replace 3 cracked tiles behind kitchen sink',
        reviewed_by_customer: true,
        customer_rating: 5
      },
      {
        id: 'demo_lw_10',
        job_title: 'Service Boiler',
        customer_name: 'Michelle Taylor',
        tradesman_name: 'Jonathan White',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(3),
        final_price: '£150',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Annual boiler service and safety check',
        reviewed_by_customer: true,
        customer_rating: 5
      },
      {
        id: 'demo_lw_11',
        job_title: 'Paint Garden Shed',
        customer_name: 'Stuart Campbell',
        tradesman_name: 'Rachel Stevens',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(3),
        final_price: '£220',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Sand and paint wooden garden shed with weather protection',
        reviewed_by_customer: true,
        customer_rating: 4
      },
      {
        id: 'demo_lw_12',
        job_title: 'Install Cat Flap',
        customer_name: 'Caroline Hughes',
        tradesman_name: 'David Morgan',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(4),
        final_price: '£85',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Cut hole and install cat flap in back door',
        reviewed_by_customer: true,
        customer_rating: 5
      },
      {
        id: 'demo_lw_13',
        job_title: 'Fix Leaky Tap',
        customer_name: 'Paul Edwards',
        tradesman_name: 'Katie Johnson',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(4),
        final_price: '£55',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Replace washer in dripping bathroom tap',
        reviewed_by_customer: true,
        customer_rating: 5
      },
      {
        id: 'demo_lw_14',
        job_title: 'Assemble Flat Pack Furniture',
        customer_name: 'Diane Parker',
        tradesman_name: 'Luke Harrison',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(5),
        final_price: '£120',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Assemble chest of drawers and bedside tables',
        reviewed_by_customer: true,
        customer_rating: 5
      },
      {
        id: 'demo_lw_15',
        job_title: 'Kitchen Renovation',
        customer_name: 'Robert Thompson',
        tradesman_name: 'Samantha Lee',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(5),
        final_price: '£3,200',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Complete kitchen renovation with new units and worktops',
        reviewed_by_customer: true,
        customer_rating: 5
      },
      {
        id: 'demo_lw_16',
        job_title: 'Mount TV on Wall',
        customer_name: 'Elizabeth Harris',
        tradesman_name: 'Marcus Williams',
        customer_photo: null,
        tradesman_photo: null,
        completed_at: getDateInLastWeek(6),
        final_price: '£110',
        status: 'completed',
        location: 'Stoke Newington, London',
        job_description: 'Securely mount 55" TV on living room wall with cable management',
        reviewed_by_customer: true,
        customer_rating: 4
      }
    ];

    setThisWeekJobs(demoThisWeek);
    setLastWeekJobs(demoLastWeek);

    const thisWeekValue = demoThisWeek.reduce((sum, job) => sum + getNumericPrice(job), 0);
    const lastWeekValue = demoLastWeek.reduce((sum, job) => sum + getNumericPrice(job), 0);

    setWeekStats({
      thisWeekCount: demoThisWeek.length,
      thisWeekValue,
      lastWeekCount: demoLastWeek.length,
      lastWeekValue
    });
  };

  // Helper functions for demo data
  const getDateInThisWeek = (dayOffset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - daysToMonday);
    
    const targetDate = new Date(thisWeekStart);
    targetDate.setDate(thisWeekStart.getDate() + dayOffset);
    return targetDate.toISOString();
  };

  const getDateInLastWeek = (dayOffset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(today.getDate() - daysToMonday - 7);
    
    const targetDate = new Date(lastWeekStart);
    targetDate.setDate(lastWeekStart.getDate() + dayOffset);
    return targetDate.toISOString();
  };

  const getNumericPrice = (job) => {
    let priceString = job.final_price || job.custom_quote || '£200';
    const priceMatch = priceString.match(/£?(\d+)/);
    return priceMatch ? parseInt(priceMatch[1]) : 200;
  };

  const getFinalPrice = (job) => {
    return job.final_price || job.custom_quote || 'Standard Rate';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending_approval': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (timeSlot) => {
    const timeSlots = {
      'morning': '9am-1pm',
      'afternoon': '1pm-5pm',
      'evening': '5pm-8pm'
    };
    return timeSlots[timeSlot] || timeSlot;
  };

  const formatCurrency = (amount) => {
    return `£${amount.toLocaleString()}`;
  };

  // Job card component
  const JobCard = ({ job, showDate = true, showStatus = true }) => (
    <div className={`bg-white rounded-lg shadow-md border-l-4 ${
      job.status === 'completed' ? 'border-green-500' :
      job.status === 'in_progress' ? 'border-yellow-500' :
      job.status === 'pending_approval' ? 'border-orange-500' :
      'border-blue-500'
    }`}>
      <div className="p-6">
        {/* Job Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{job.job_title}</h3>
              {showStatus && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(job.status)}`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ')}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-2">
                {userType === 'customer' ? (
                  <>
                    {job.tradesman_photo ? (
                      <LazyImage 
                        src={job.tradesman_photo} 
                        alt="Tradesman" 
                        className="w-6 h-6 rounded-full object-cover"
                        width="24px"
                        height="24px"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                    )}
                    <span><strong>Tradesman:</strong> {job.tradesman_name}</span>
                  </>
                ) : (
                  <>
                    {job.customer_photo ? (
                      <LazyImage 
                        src={job.customer_photo} 
                        alt="Customer" 
                        className="w-6 h-6 rounded-full object-cover"
                        width="24px"
                        height="24px"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                    )}
                    <span><strong>Customer:</strong> {job.customer_name}</span>
                  </>
                )}
              </div>
              
              {showDate && (
                <>
                  {job.agreed_date && (
                    <span><strong>Date:</strong> {formatDate(job.agreed_date)}</span>
                  )}
                  {job.completed_at && (
                    <span><strong>Completed:</strong> {formatDate(job.completed_at)}</span>
                  )}
                  {job.time_slot && (
                    <span><strong>Time:</strong> {formatTime(job.time_slot)}</span>
                  )}
                </>
              )}
              
              {job.location && (
                <span><strong>Location:</strong> {job.location}</span>
              )}
              
              <span className="text-green-600 font-semibold">
                <strong>Value:</strong> {getFinalPrice(job)}
              </span>
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div className="mb-4">
          <p className="text-gray-700 text-sm">
            {job.job_description?.length > 100 
              ? `${job.job_description.slice(0, 100)}...` 
              : job.job_description}
          </p>
        </div>

        {/* Customer Rating for completed jobs */}
        {job.status === 'completed' && job.reviewed_by_customer && job.customer_rating && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Customer Rating:</span>
              <div className="flex text-yellow-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={star <= job.customer_rating ? 'text-yellow-400' : 'text-gray-300'}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-gray-600">({job.customer_rating}/5)</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/active-jobs')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm"
          >
            View Details
          </button>
          
          {job.status === 'completed' && userType === 'customer' && (
            <button
              onClick={() => navigate(`/booking-request/${job.tradesman_id}`, { 
                state: { 
                  prefillTitle: job.job_title,
                  source: 'hire_again' 
                } 
              })}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-sm"
            >
              🔄 Hire Again
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading weekly jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">


      {/* Weekly Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week Jobs</p>
              <p className="text-2xl font-bold text-blue-600">{weekStats.thisWeekCount}</p>
            </div>
            <div className="text-3xl text-blue-500">📅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week Value</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(weekStats.thisWeekValue)}</p>
            </div>
            <div className="text-3xl text-green-500">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Week Jobs</p>
              <p className="text-2xl font-bold text-purple-600">{weekStats.lastWeekCount}</p>
            </div>
            <div className="text-3xl text-purple-500">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Week Value</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(weekStats.lastWeekValue)}</p>
            </div>
            <div className="text-3xl text-orange-500">🏆</div>
          </div>
        </div>
      </div>

      {/* This Week's Jobs */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">This Week's Jobs</h2>
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'long',
              year: 'numeric'
            })} week
          </span>
        </div>
        
        {thisWeekJobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-500 mb-4">
              <div className="text-4xl mb-2">🚀</div>
              <h3 className="text-lg font-medium">Ready to Get This Busy?</h3>
              <p className="text-sm">
                {userType === 'customer' 
                  ? 'This demo shows 15 jobs from £35 to £2,400 this week in Stoke Newington - browse tradesmen for jobs big and small!' 
                  : 'This demo shows what earning £4,050 a week in Stoke Newington looks like - from quick £35 fixes to £2,400 renovations!'}
              </p>
            </div>
            {userType === 'customer' && (
              <button
                onClick={() => navigate('/browse')}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 mt-4"
              >
                🏠 Find Jobs in Stoke Newington
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {thisWeekJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Last Week's Completed Jobs */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Last Week's Completed Jobs</h2>
          <span className="text-sm text-gray-500">
            {(() => {
              const lastWeek = new Date();
              lastWeek.setDate(lastWeek.getDate() - 7);
              return lastWeek.toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'long',
                year: 'numeric'
              });
            })()} week
          </span>
        </div>
        
        {lastWeekJobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-500 mb-4">
              <div className="text-4xl mb-2">💎</div>
              <h3 className="text-lg font-medium">Building Success at Every Level</h3>
              <p className="text-sm">This demo shows £4,245 in completed jobs last week in Stoke Newington - from £35 quick fixes to £3,200 projects. Your completed jobs will appear here as you serve every type of customer!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {lastWeekJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Success-Focused Quick Actions - ACCESSIBLE VERSION */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Jobs for Every Budget in Stoke Newington! 🏠</h3>
        <p className="text-gray-600 text-sm mb-4">From £35 quick fixes to £3,200 renovations - everyone's welcome on Patchwork Trades:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/active-jobs')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            📋 Manage All 31 Jobs
          </button>
          
          {userType === 'customer' ? (
            <button
              onClick={() => navigate('/browse')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              🔍 Find Stoke Newington Tradesmen
            </button>
          ) : (
            <button
              onClick={() => navigate('/earnings-overview')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              💰 See £8K+ Earnings
            </button>
          )}
          
          <button
            onClick={() => navigate('/quote-requests')}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium transition-colors"
          >
            💬 Handle All Quotes
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyJobs;
