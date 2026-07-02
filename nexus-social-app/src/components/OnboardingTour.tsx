'use client';

import React, { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { completeOnboarding } from '@/actions/completeOnboarding';
import { usePathname } from 'next/navigation';

interface OnboardingTourProps {
  userId: string;
  hasCompleted: boolean;
}

export default function OnboardingTour({ userId, hasCompleted }: OnboardingTourProps) {
  const pathname = usePathname();
  const driverRef = useRef<any>(null);

  useEffect(() => {
    // Only run if not completed, and don't run on the login/signup pages
    if (hasCompleted || pathname.includes('/login')) return;

    // We check localStorage to see if they're mid-tour
    const storedStepIndex = localStorage.getItem('nexus_tour_step');
    const startIndex = storedStepIndex ? parseInt(storedStepIndex, 10) : 0;

    if (startIndex >= 8) {
      // Completed according to local storage
      return;
    }

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: false, // Force them to explicitly skip
      nextBtnText: 'Next',
      prevBtnText: 'Previous',
      doneBtnText: 'Get Started',
      onNextClick: () => {
        const currentStep = driverObj.getActiveIndex();
        if (currentStep !== undefined) {
          localStorage.setItem('nexus_tour_step', String(currentStep + 1));
        }
        driverObj.moveNext();
      },
      onPrevClick: () => {
        const currentStep = driverObj.getActiveIndex();
        if (currentStep !== undefined && currentStep > 0) {
          localStorage.setItem('nexus_tour_step', String(currentStep - 1));
        }
        driverObj.movePrevious();
      },
      onDestroyStarted: async () => {
        // This is triggered when the user hits 'Skip' or 'Close'
        const isConfirm = window.confirm('Are you sure you want to skip the onboarding tour?');
        if (isConfirm) {
          driverObj.destroy();
          localStorage.setItem('nexus_tour_step', '8'); // mark done locally
          await completeOnboarding(userId); // persist in DB
        }
      },
      steps: [
        {
          element: '#dashboard-welcome',
          popover: {
            title: 'Your command center',
            description: 'The dashboard shows KPIs, quick actions, and recent activity for your workspace.',
            side: 'bottom', align: 'start'
          }
        },
        {
          element: '#workspace-switcher',
          popover: {
            title: 'Welcome to Nexus Social',
            description: 'This is your workspace. You can invite team members and manage different brands from here.',
            side: 'right', align: 'start'
          }
        },
        {
          element: '#nav-settings',
          popover: {
            title: 'Connect your first social profile',
            description: 'Head over to Settings > Channels to connect your Facebook, Instagram, LinkedIn, or X accounts.',
            side: 'right', align: 'start'
          }
        },
        {
          element: '#btn-create-post',
          popover: {
            title: 'Create your first post',
            description: 'Click here to start drafting your first social media post.',
            side: 'bottom', align: 'end'
          }
        },
        {
          element: '.ai-caption-btn', // We need to add this class to the button
          popover: {
            title: 'Let AI write for you',
            description: 'Stuck? Use our integrated AI to instantly generate high-converting captions based on your prompt.',
            side: 'top', align: 'start'
          }
        },
        {
          element: '.date-picker-input', // We need to add this class to the input
          popover: {
            title: 'Schedule it',
            description: 'Pick the perfect date and time for your audience.',
            side: 'top', align: 'start'
          }
        },
        {
          element: '#nav-calendar',
          popover: {
            title: 'View your Calendar',
            description: 'See all your scheduled posts in a beautiful calendar view.',
            side: 'right', align: 'start'
          }
        },
        {
          element: '#nav-analytics',
          popover: {
            title: 'Track Performance',
            description: 'Measure your growth with real-time analytics and beautiful PDF reports. You are all set!',
            side: 'right', align: 'start',
            onNextClick: async () => {
              driverObj.destroy();
              localStorage.setItem('nexus_tour_step', '8');
              await completeOnboarding(userId);
            }
          }
        }
      ]
    });

    driverRef.current = driverObj;
    
    // We wait 1 second for the DOM to settle before starting the tour
    setTimeout(() => {
      // Only start if the element for the current step exists in the DOM to prevent crashes
      const currentStepObj = driverObj.getConfig().steps?.[startIndex];
      if (currentStepObj && document.querySelector(currentStepObj.element as string)) {
        driverObj.drive(startIndex);
      } else {
        // If the element isn't on the page (e.g. they navigated away), we just wait for the right page.
      }
    }, 1000);

    return () => {
      driverObj.destroy();
    };
  }, [hasCompleted, pathname, userId]);

  return null; // This is a logic-only component
}
