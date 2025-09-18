
import React, { useState } from 'react';
import { useSubscription, useAuth } from '../App';
import { Plan, PlanId, SubscriptionStatus } from '../types';
import { mockApi } from '../services/mockApi';

const plans: Record<PlanId, Plan> = {
  [PlanId.BASIC]: {
    id: PlanId.BASIC, name: 'Basic', price: 29, userLimit: 2,
    features: ['1-2 Users', 'Work Order Management', 'Basic Inventory', 'Email Support']
  },
  [PlanId.STANDARD]: {
    id: PlanId.STANDARD, name: 'Standard', price: 59, userLimit: 5,
    features: ['Up to 5 Users', 'All Basic Features', 'Customer Invoicing', 'Reporting Suite']
  },
  [PlanId.PRO]: {
    id: PlanId.PRO, name: 'Pro', price: 99, userLimit: 'unlimited',
    features: ['Unlimited Users', 'All Standard Features', 'Advanced Analytics', 'Priority Support']
  },
};

const PlanCard: React.FC<{ plan: Plan; currentPlanId?: PlanId; onSelect: (planId: PlanId) => void; disabled: boolean }> = ({ plan, currentPlanId, onSelect, disabled }) => {
  const isCurrent = plan.id === currentPlanId;
  return (
    <div className={`border rounded-lg p-6 flex flex-col ${isCurrent ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'}`}>
      <h3 className="text-lg font-semibold text-gray-800">{plan.name}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">£{plan.price}<span className="text-sm font-normal text-gray-500">/month</span></p>
      <p className="mt-2 text-sm text-gray-500">For teams with {plan.userLimit} users.</p>
      <ul className="mt-6 space-y-3 text-sm text-gray-600 flex-grow">
        {plan.features.map(feature => (
          <li key={feature} className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            {feature}
          </li>
        ))}
      </ul>
      <button
        onClick={() => onSelect(plan.id)}
        disabled={isCurrent || disabled}
        className="mt-6 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isCurrent ? 'Current Plan' : 'Select Plan'}
      </button>
    </div>
  );
};

const StatusBanner: React.FC = () => {
    const { subscription } = useSubscription();
    if (!subscription) return null;

    const daysLeft = subscription.trialEnds ? Math.ceil((new Date(subscription.trialEnds).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

    switch (subscription.status) {
        case SubscriptionStatus.TRIALING:
            return <div className="p-4 mb-6 text-sm text-blue-700 bg-blue-100 rounded-lg">Your trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. Select a plan to continue service without interruption.</div>
        case SubscriptionStatus.PAST_DUE:
            return <div className="p-4 mb-6 text-sm text-red-700 bg-red-100 rounded-lg"><strong>Action Required:</strong> Your trial has ended. Please subscribe to a plan to regain access to the application.</div>
        case SubscriptionStatus.CANCELLED:
            return <div className="p-4 mb-6 text-sm text-yellow-700 bg-yellow-100 rounded-lg">Your subscription is cancelled and will not renew. Access will end on {new Date(subscription.renewalDate!).toLocaleDateString()}.</div>
        case SubscriptionStatus.ACTIVE:
            return <div className="p-4 mb-6 text-sm text-green-700 bg-green-100 rounded-lg">Your subscription is active. It will renew on {new Date(subscription.renewalDate!).toLocaleDateString()}.</div>
        default:
            return null;
    }
}


const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const { subscription, isLoading, refetch } = useSubscription();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSelectPlan = async (planId: PlanId) => {
    if (!user?.tenantId) return;
    setIsUpdating(true);
    await mockApi.updateSubscriptionPlan(user.tenantId, planId);
    refetch();
    setIsUpdating(false);
  };
  
  const handleExpireTrial = async () => {
    if (!user?.tenantId) return;
    setIsUpdating(true);
    await mockApi.expireTrial(user.tenantId);
    refetch();
    setIsUpdating(false);
  };

  if (isLoading) {
    return <div>Loading billing information...</div>;
  }
  
  const pageTitle = subscription?.status === SubscriptionStatus.PAST_DUE ? "Subscribe to Continue" : "Manage Subscription";

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{pageTitle}</h1>
        <p className="text-gray-600 mb-8">Choose the right plan for your workshop or manage your existing subscription.</p>

        <StatusBanner />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Object.values(plans).map(plan => (
            <PlanCard 
              key={plan.id} 
              plan={plan} 
              currentPlanId={subscription?.planId} 
              onSelect={handleSelectPlan}
              disabled={isUpdating}
            />
          ))}
        </div>
        
        {isUpdating && <div className="text-center mt-4 text-blue-600">Updating subscription...</div>}

        <div className="mt-12 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
          <h3 className="font-semibold text-yellow-800">Developer Tools</h3>
          <p className="text-sm text-yellow-700">Use this button to simulate your trial period ending.</p>
          <button 
            onClick={handleExpireTrial}
            disabled={isUpdating}
            className="mt-2 bg-yellow-500 text-white px-3 py-1 rounded-md text-sm hover:bg-yellow-600 disabled:bg-gray-400"
          >
            Expire My Trial
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
