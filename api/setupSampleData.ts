import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

const database = cosmosClient.database('app');
const container = database.container('entities');

export async function setupSampleData(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Setting up sample data...`);

  try {
    const districtId = 'district-001';
    const now = new Date();

    // Create district
    const district = {
      id: districtId,
      type: 'district',
      name: 'Test School District',
      createdAt: now,
      updatedAt: now
    };

    // Create schools
    const schools = [
      {
        id: 'school-001',
        type: 'school',
        districtId,
        name: 'Lincoln Elementary School',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'school-002',
        type: 'school', 
        districtId,
        name: 'Washington Middle School',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'school-003',
        type: 'school',
        districtId,
        name: 'Roosevelt High School', 
        createdAt: now,
        updatedAt: now
      }
    ];

    // Create certification types
    const certTypes = [
      {
        id: 'cert-teaching-license',
        type: 'certType',
        name: 'State Teaching License',
        defaultValidMonths: 60,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'cert-cpr',
        type: 'certType',
        name: 'Pediatric CPR Certification', 
        defaultValidMonths: 24,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'cert-food-handler',
        type: 'certType',
        name: 'Food Handler Permit',
        defaultValidMonths: 36,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'cert-background-check',
        type: 'certType',
        name: 'Background Check',
        defaultValidMonths: 12,
        createdAt: now,
        updatedAt: now
      }
    ];

    // Create profile for test user
    const profile = {
      id: 'test-user-123',
      type: 'profile',
      districtId,
      roleKey: 'district_admin',
      createdAt: now,
      updatedAt: now
    };

    // Insert all data
    const allData = [district, ...schools, ...certTypes, profile];
    const results = [];

    for (const item of allData) {
      try {
        const { resource } = await container.items.create(item);
        results.push(resource);
        context.log(`Created ${item.type}: ${item.id || (item as any).name}`);
      } catch (error: any) {
        if (error.code === 409) {
          context.log(`${item.type} ${item.id} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    return {
      status: 200,
      body: JSON.stringify({
        message: 'Sample data setup complete',
        created: results.length,
        district: district.name,
        schools: schools.length,
        certTypes: certTypes.length
      })
    };

  } catch (error) {
    context.log('Error setting up sample data:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to setup sample data' })
    };
  }
}

app.http('setupSampleData', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: setupSampleData
});