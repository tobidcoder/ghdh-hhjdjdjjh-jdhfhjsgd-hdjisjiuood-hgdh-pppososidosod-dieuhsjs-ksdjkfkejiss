// // import { getDatabase } from '../database/connection'
// import { jest } from '@jest/globals'
// import { withRetry } from '../utils/retryUtils'
// import { syncSaleToRemote } from '../services/sales-new'
// import { fetchProductsFromApi } from '../services/products-new'

// describe('Sync Functions', () => {
//   beforeEach(() => {
//     // Mock fetch
//     global.fetch = jest.fn()
//   })

//   afterEach(() => {
//     jest.clearAllMocks()
//   })

//   describe('syncSaleToRemote', () => {
//     it('should successfully sync a sale', async () => {
//       const mockSale = {
//         id: 'test_sale_1',
//         invoice_number: 'INV-001',
//         items: JSON.stringify([{ id: 1, name: 'Test Item' }]),
//         total_amount: 100
//       }

//       const mockResponse = { success: true, data: { id: 1 } }
//       ;(global.fetch as jest.Mock).mockResolvedValueOnce({
//         ok: true,
//         json: () => Promise.resolve(mockResponse)
//       })

//       await expect(
//         syncSaleToRemote(mockSale, 'test_token', 'http://api.test')
//       ).resolves.not.toThrow()
//     })

//     it('should retry on network errors', async () => {
//       const mockSale = {
//         id: 'test_sale_1',
//         invoice_number: 'INV-001',
//         items: JSON.stringify([{ id: 1, name: 'Test Item' }]),
//         total_amount: 100
//       }

//       // First two calls fail, third succeeds
//       ;(global.fetch as jest.Mock)
//         .mockRejectedValueOnce(new Error('ETIMEDOUT'))
//         .mockRejectedValueOnce(new Error('ECONNRESET'))
//         .mockResolvedValueOnce({
//           ok: true,
//           json: () => Promise.resolve({ success: true })
//         })

//       await expect(
//         syncSaleToRemote(mockSale, 'test_token', 'http://api.test')
//       ).resolves.not.toThrow()

//       expect(global.fetch).toHaveBeenCalledTimes(3)
//     })
//   })

//   describe('fetchProductsFromApi', () => {
//     it('should successfully fetch products', async () => {
//       const mockProducts = {
//         success: true,
//         data: [
//           {
//             id: 1,
//             attributes: {
//               name: 'Test Product',
//               selling_price: '10.99',
//               category_id: 1,
//               sku: 'TEST001'
//             }
//           }
//         ]
//       }

//       ;(global.fetch as jest.Mock).mockResolvedValueOnce({
//         ok: true,
//         json: () => Promise.resolve(mockProducts)
//       })

//       const products = await fetchProductsFromApi('test_token', 'http://api.test')
//       expect(products).toHaveLength(1)
//       expect(products[0]).toMatchObject({
//         id: '1',
//         name: 'Test Product',
//         price: 10.99,
//         category: 1,
//         code: 'TEST001'
//       })
//     })

//     it('should handle API errors gracefully', async () => {
//       ;(global.fetch as jest.Mock).mockResolvedValueOnce({
//         ok: false,
//         status: 500,
//         text: () => Promise.resolve('Internal Server Error')
//       })

//       await expect(fetchProductsFromApi('test_token', 'http://api.test')).rejects.toThrow(
//         'HTTP 500: Internal Server Error'
//       )
//     })
//   })

//   describe('withRetry', () => {
//     it('should retry failed operations', async () => {
//       const mockOperation = jest
//         .fn()
//         .mockRejectedValueOnce(new Error('ETIMEDOUT'))
//         .mockRejectedValueOnce(new Error('ECONNRESET'))
//         .mockResolvedValueOnce('success')

//       const result = await withRetry(mockOperation, {
//         maxRetries: 3,
//         delayMs: 100,
//         retryableErrors: ['ETIMEDOUT', 'ECONNRESET']
//       })

//       expect(result).toBe('success')
//       expect(mockOperation).toHaveBeenCalledTimes(3)
//     })

//     it('should not retry on non-retryable errors', async () => {
//       const mockOperation = jest.fn().mockRejectedValue(new Error('AUTH_ERROR'))

//       await expect(
//         withRetry(mockOperation, {
//           maxRetries: 3,
//           delayMs: 100,
//           retryableErrors: ['ETIMEDOUT', 'ECONNRESET']
//         })
//       ).rejects.toThrow('AUTH_ERROR')

//       expect(mockOperation).toHaveBeenCalledTimes(1)
//     })
//   })
// })
