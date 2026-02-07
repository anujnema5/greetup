import { Button } from '@/components/ui/button'
import React from 'react'
import { FaPhoneAlt } from 'react-icons/fa'
import { MdMail } from 'react-icons/md'

const LoginToggleButtons = ({ currentView, onToggle }: { currentView: string, onToggle: () => void; }) => {
    return (
        <>
            {/* {currentView === "email" && (
                <Button className="mt-3 w-full gap-2" onClick={onToggle}>
                    <FaPhoneAlt size={10} />
                    Continue with Phone
                </Button>
            )} */}

            {currentView === "phone" && (
                <Button className="mt-3 w-full gap-2" onClick={onToggle}>
                    <MdMail />
                    Continue with Email
                </Button>
            )}
        </>
    )
}

export default LoginToggleButtons;