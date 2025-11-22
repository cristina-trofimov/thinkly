import { AlgoTimeSessionForm } from '../components/forms/AlgoTimeForm';

export default function ManageAlgoTimePage() {
  return (
    <div className="min-h-screen flex flex-col gap-4">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create a New AlgoTime Session
        </h1>
        <p className="text-gray-600">
          Fill in the details below to create a new Session.
        </p>
      </div>
      {/* Form Component */}
      <AlgoTimeSessionForm />
    </div>
  );
}
