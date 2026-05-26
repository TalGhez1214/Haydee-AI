'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProjectSetupWizard } from './project-setup-wizard'
import { IconPlus } from '@tabler/icons-react'

export function NewProjectButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <IconPlus size={16} />
        New Project
      </Button>
      <ProjectSetupWizard open={open} onClose={() => setOpen(false)} />
    </>
  )
}
