import importlib.util,json,tempfile,unittest,sys
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'native/career/data/jobboard/fetch_listings.py'
spec=importlib.util.spec_from_file_location('staged_parser',P);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ParserTests(unittest.TestCase):
 def test_restrictions_and_open_promotional(self):
  for title,desc,exam,want in [
   ('Fire Captain Promotional Only','Applicants must be currently employed with the Visalia Fire Department.','','promotional'),
   ('Fire Engineer','This is an internal recruitment for current employees only.','Open','internal'),
   ('Fire Captain (Open & Promotional)','This recruitment is only open to current County Fire employees.','Open & Promotional','internal'),
   ('Firefighter-Paramedic','','Promotional','promotional'),
   ('Firefighter (Open and Promotional)','','Open & Promotional','public'),
   ('Firefighter','Applicants must be currently employed as firefighters at any agency.','','unknown'),
   ('Firefighter','Two years experience required.','','unknown')]:
   self.assertEqual(m.classify_access(title,desc,exam)[0],want)
 def test_role_labels_keep_track_and_job_type(self):
  self.assertEqual(m.classify_roles('Lateral Firefighter/Paramedic','PART-TIME'),['Lateral','Part-Time'])
 def test_county_and_city_agencies_stay_distinct(self):
  agencies={slug:name for name,region,slug in m.AGENCIES}
  self.assertEqual(agencies['sccfd'],'Santa Clara County Fire Department')
  self.assertEqual(agencies['cityofsantaclaraca'],'Santa Clara Fire Department')
 def test_zero_scrape_preserves_existing_feed(self):
  summary={'agencies_attempted':170,'agencies_ok':0,'agencies_errored':170}
  with patch.object(m,'scrape',return_value=([],summary)),patch.object(m,'write_health'),patch.object(m,'write') as write,patch.object(sys,'argv',['fetch_listings.py']):
   with self.assertRaises(SystemExit) as e:m.main()
   self.assertEqual(e.exception.code,1);write.assert_not_called()
 def test_dates_reject_missing_or_unknown(self):
  self.assertIsNone(m.parse_neogov_date(''));self.assertIsNone(m.parse_neogov_date('unknown'))
  self.assertEqual(m.parse_neogov_date('Mon, 12 Oct 2026 23:59:00:0'),'2026-10-12')
 def test_writer_uses_schema2_and_timezone(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'candidate.json';m.write([],str(p));meta=json.loads(p.read_text())['meta']
   self.assertEqual(meta['schema_version'],2);self.assertTrue(meta['generated'].endswith('+00:00'))
 def test_xml_keeps_unknown_access_and_structured_pay(self):
  xml='''<rss xmlns:joblisting="http://www.neogov.com/namespaces/JobListing"><channel><item><title>Firefighter / Paramedic</title><link>https://www.governmentjobs.com/careers/example/jobs/123</link><description><![CDATA[<p>Experience required.</p>]]></description><joblisting:jobType>PART-TIME</joblisting:jobType><joblisting:minimumSalary>50000</joblisting:minimumSalary><joblisting:maximumSalary>60000</joblisting:maximumSalary><joblisting:salaryInterval>Year</joblisting:salaryInterval></item></channel></rss>'''
  row=m.parse_feed(xml,'Example','Bay Area')[0]
  self.assertEqual(row['access_status'],'unknown');self.assertEqual(row['employment_type'],'PART-TIME');self.assertEqual(row['salary_min'],'50000');self.assertIsNone(row['open_date'])
if __name__=='__main__':unittest.main(verbosity=2)
