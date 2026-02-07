import ProfileSetupStep from '@/features/profile-setup/pages/profile-setup-steps'
import { ProfileSetupProvider } from '@/features/profile-setup/provider'
import React from 'react'

const page = () => {
    return (
        <ProfileSetupProvider>
            <ProfileSetupStep />
        </ProfileSetupProvider>
    )
}

export default page