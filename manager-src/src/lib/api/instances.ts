import { request } from './client'
import type { Instance, InstanceCreateInput } from '@/lib/types'

export function listInstances(): Promise<Instance[]> {
  return request<Instance[]>('/instance/all')
}

export function getInstance(instanceId: string): Promise<Instance> {
  return request<Instance>(`/instance/info/${instanceId}`)
}

export function createInstance(input: InstanceCreateInput): Promise<Instance> {
  return request<Instance>('/instance/create', {
    method: 'POST',
    body: input,
  })
}

export function deleteInstance(instanceId: string): Promise<void> {
  return request<void>(`/instance/delete/${instanceId}`, { method: 'DELETE' })
}
